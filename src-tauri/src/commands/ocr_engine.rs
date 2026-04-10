use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCREngineConfig {
    pub engine: String,
    pub language: Vec<String>,
    pub confidence_threshold: f32,
    pub use_gpu: bool,
}

impl Default for OCREngineConfig {
    fn default() -> Self {
        Self {
            engine: "tesseract".to_string(),
            language: vec!["eng".to_string()],
            confidence_threshold: 0.7,
            use_gpu: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResultItem {
    pub text: String,
    pub confidence: f32,
    pub bounding_box: BoundingBox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRProcessResult {
    pub items: Vec<OCRResultItem>,
    pub full_text: String,
    pub language_detected: String,
    pub processing_time_ms: u64,
}

#[tauri::command]
pub async fn init_ocr_engine(config: OCREngineConfig) -> Result<String, String> {
    tracing::info!("Initializing OCR engine: {} with {:?}", config.engine, config.language);
    
    match config.engine.as_str() {
        "paddle" => {
            // Check if Python and PaddleOCR are available
            match find_python_binary() {
                Ok(_) => {
                    match find_paddle_ocr_script() {
                        Ok(script) => {
                            tracing::info!("PaddleOCR script found at: {}", script.display());
                            Ok("paddle-native".to_string())
                        }
                        Err(e) => Err(format!(
                            "PaddleOCR script not found: {}. Please ensure src-tauri/scripts/paddle_ocr.py exists.",
                            e
                        ))
                    }
                }
                Err(e) => Err(format!(
                    "Python not found: {}. PaddleOCR requires Python 3.8+.",
                    e
                ))
            }
        }
        "tesseract" => {
            // Tesseract is used via WASM on frontend
            Ok("tesseract-wasm".to_string())
        }
        "easyocr" => {
            Err("EasyOCR native integration not yet implemented".to_string())
        }
        _ => Err(format!("Unknown OCR engine: {}", config.engine))
    }
}

#[tauri::command]
pub async fn process_image_ocr(
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    config: OCREngineConfig,
) -> Result<OCRProcessResult, String> {
    tracing::info!("Processing image with {} OCR engine", config.engine);
    
    if image_data.is_empty() {
        return Err("Image data is empty".to_string());
    }
    
    if width == 0 || height == 0 {
        return Err("Invalid image dimensions".to_string());
    }
    
    // Dispatch to PaddleOCR if configured
    if config.engine == "paddle" {
        return process_paddle_ocr(
            image_data, width, height,
            None, None, None, None,
            config,
        ).await;
    }
    
    Err(format!(
        "Native OCR processing not yet implemented for {} engine. Use Tesseract.js on frontend.",
        config.engine
    ))
}

#[tauri::command]
pub async fn process_roi_ocr(
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    roi_x: u32,
    roi_y: u32,
    roi_width: u32,
    roi_height: u32,
    config: OCREngineConfig,
) -> Result<OCRProcessResult, String> {
    tracing::info!("Processing ROI ({}, {}) {}x{} with {} engine", 
        roi_x, roi_y, roi_width, roi_height, config.engine);
    
    if image_data.is_empty() {
        return Err("Image data is empty".to_string());
    }
    
    if roi_width == 0 || roi_height == 0 {
        return Err("ROI has invalid dimensions".to_string());
    }
    
    // Dispatch to PaddleOCR if configured
    if config.engine == "paddle" {
        return process_paddle_ocr(
            image_data, width, height,
            Some(roi_x), Some(roi_y), Some(roi_width), Some(roi_height),
            config,
        ).await;
    }
    
    Err(format!(
        "ROI-based OCR processing not yet implemented for {} engine",
        config.engine
    ))
}

#[tauri::command]
pub fn get_available_ocr_engines() -> HashMap<String, bool> {
    let mut engines = HashMap::new();
    // Tesseract.js is available via frontend WASM
    engines.insert("tesseract".to_string(), true);
    
    // Check PaddleOCR availability dynamically
    let paddle_available = find_python_binary().is_ok() && find_paddle_ocr_script().is_ok();
    engines.insert("paddle".to_string(), paddle_available);
    
    // EasyOCR requires Python but not yet integrated
    engines.insert("easyocr".to_string(), false);
    engines
}

#[tauri::command]
pub fn get_ocr_engine_info(engine: String) -> Result<serde_json::Value, String> {
    match engine.as_str() {
        "tesseract" => Ok(serde_json::json!({
            "name": "Tesseract.js",
            "type": "wasm",
            "languages": ["eng", "chi_sim", "chi_tra", "jpn", "kor", "fra", "deu", "spa", "por", "ita"],
            "gpu_support": false,
            "accuracy": "medium",
            "speed": "fast",
            "description": "Pure JavaScript OCR using WebAssembly. Works in browser without native installation."
        })),
        "paddle" => Ok(serde_json::json!({
            "name": "PaddleOCR",
            "type": "native",
            "languages": ["ch", "en", "ja", "ko", "fr", "de", "es", "ru", "ar"],
            "gpu_support": true,
            "cpu_support": true,
            "accuracy": "high",
            "speed": "medium",
            "description": "BAIDU's PP-OCRv3 engine. High accuracy, especially for Chinese. CPU mode fully supported (use_gpu=false). Requires Python + paddlepaddle + paddleocr packages."
        })),
        "easyocr" => Ok(serde_json::json!({
            "name": "EasyOCR",
            "type": "native",
            "languages": ["ch", "en", "ja", "ko", "fr", "de", "es", "it", "pt", "ru"],
            "gpu_support": true,
            "accuracy": "high",
            "speed": "slow",
            "description": "Python-based OCR with broad language support. Requires Python integration."
        })),
        _ => Err(format!("Unknown OCR engine: {}. Available: tesseract, paddle, easyocr", engine))
    }
}

/// OCR an image using Tesseract CLI (if available on the system)
/// This provides native OCR without requiring WASM
#[tauri::command]
pub async fn ocr_image_tesseract(
    image_path: String,
    language: String,
    tesseract_path: Option<String>,
) -> Result<OCRProcessResult, String> {
    use std::process::Command;
    use std::time::Instant;
    
    let start = Instant::now();
    
    // First, try using native Rust tesseract crate if available
    if let Ok(result) = try_native_tesseract(&image_path, &language) {
        let processing_time_ms = start.elapsed().as_millis() as u64;
        return Ok(OCRProcessResult {
            items: result.0,
            full_text: result.1,
            language_detected: language.clone(),
            processing_time_ms,
        });
    }
    
    // Fallback to CLI tesseract
    tracing::info!("Native tesseract crate not available, using CLI");
    
    // Determine tesseract binary path
    let tesseract = tesseract_path.unwrap_or_else(|| "tesseract".to_string());
    
    // Check if tesseract is available
    let version_check = Command::new(&tesseract)
        .args(["--version"])
        .output();
    
    if version_check.is_err() {
        return Err(format!(
            "Tesseract not found. Install Tesseract OCR and ensure it's in your PATH, \
            or use Tesseract.js on the frontend."
        ));
    }
    
    // Build tesseract command - output TSV format for detailed results
    let output = Command::new(&tesseract)
        .arg(&image_path)
        .arg("stdout")
        .arg("-l")
        .arg(&language)
        .arg("tsv")
        .output()
        .map_err(|e| format!("Failed to run tesseract: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Tesseract OCR failed: {}", stderr));
    }
    
    // Parse TSV output to extract text, confidence, and bounding boxes
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut items = Vec::new();
    let mut full_text = String::new();
    
    for (idx, line) in stdout.lines().enumerate() {
        if idx == 0 {
            // First line is header, skip
            continue;
        }
        
        let fields: Vec<&str> = line.split('\t').collect();
        if fields.len() < 12 {
            continue;
        }
        
        // Parse TSV fields: level page_num block_num par_num line_num word_num 
        //                   left top width height conf text
        // Index:            0      1        2         3       4         5
        //                   6     7      8      9       10      11
        let text = fields[11].to_string();
        if text.is_empty() {
            continue;
        }
        
        let conf: f32 = fields[10].parse().unwrap_or(0.0);
        
        let bbox = BoundingBox {
            x: fields[6].parse().unwrap_or(0),
            y: fields[7].parse().unwrap_or(0),
            width: fields[8].parse().unwrap_or(0),
            height: fields[9].parse().unwrap_or(0),
        };
        
        items.push(OCRResultItem {
            text: text.clone(),
            confidence: conf / 100.0,
            bounding_box: bbox,
        });
        
        if !full_text.is_empty() {
            full_text.push(' ');
        }
        full_text.push_str(&text);
    }
    
    let processing_time_ms = start.elapsed().as_millis() as u64;
    
    // Detect language (best effort based on what was requested)
    let language_detected = if language.contains("chi") {
        "chinese".to_string()
    } else if language.contains("jpn") {
        "japanese".to_string()
    } else if language.contains("kor") {
        "korean".to_string()
    } else {
        language.clone()
    };
    
    Ok(OCRProcessResult {
        items,
        full_text,
        language_detected,
        processing_time_ms,
    })
}

/// Try native Rust tesseract bindings (requires tesseract-sys crate)
/// Returns Ok with (items, full_text) or Err if not available
fn try_native_tesseract(image_path: &str, language: &str) -> Result<(Vec<OCRResultItem>, String), String> {
    // Try to use tesseract crate if compiled with TESSERACT_SUPPORT
    // This is a compile-time feature, so we check at runtime instead
    
    // For now, just return error to use CLI fallback
    // In production, you would enable the "tesseract" feature in Cargo.toml
    // and use the tesseract crate directly
    Err("Native tesseract not enabled".to_string())
}

/// Process an image with PaddleOCR via Python bridge script.
/// This is the native PaddleOCR integration for high-accuracy OCR.
#[tauri::command]
pub async fn process_paddle_ocr(
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    roi_x: Option<u32>,
    roi_y: Option<u32>,
    roi_width: Option<u32>,
    roi_height: Option<u32>,
    config: OCREngineConfig,
) -> Result<OCRProcessResult, String> {
    use std::io::Write;

    tracing::info!(
        "process_paddle_ocr: {}x{} image, ROI offset=({}, {}) size=({}, {}), engine={}",
        width, height,
        roi_x.unwrap_or(0), roi_y.unwrap_or(0),
        roi_width.unwrap_or(width), roi_height.unwrap_or(height),
        config.engine
    );

    if image_data.is_empty() {
        return Err("Image data is empty".to_string());
    }
    if width == 0 || height == 0 {
        return Err("Invalid image dimensions".to_string());
    }

    let start = Instant::now();

    // Write image data to a temp PNG file
    let temp_dir = std::env::temp_dir();
    let image_path = temp_dir.join(format!("hardsubx_paddle_{}.png", uuid_v4()));

    {
        let mut file = std::fs::File::create(&image_path)
            .map_err(|e| format!("Failed to create temp image: {}", e))?;
        // Write PNG signature + raw pixel data
        file.write_all(&image_data)
            .map_err(|e| format!("Failed to write image data: {}", e))?;
    }

    // Build input JSON for the Python script
    let lang = config.language.get(0).cloned().unwrap_or_else(|| "ch".to_string());
    let use_gpu = config.use_gpu;

    let mut input_json = serde_json::json!({
        "image_path": image_path.to_string_lossy(),
        "language": lang,
        "use_gpu": use_gpu,
        "return_words": true,
    });

    // Add ROI if specified (as percentage values)
    if let (Some(x), Some(y), Some(w), Some(h)) = (roi_x, roi_y, roi_width, roi_height) {
        // Convert pixel ROI to percentage
        let roi_json = serde_json::json!({
            "x": (x as f64 / width as f64) * 100.0,
            "y": (y as f64 / height as f64) * 100.0,
            "width": (w as f64 / width as f64) * 100.0,
            "height": (h as f64 / height as f64) * 100.0,
        });
        input_json["roi"] = roi_json;
    }

    let input_str = serde_json::to_string(&input_json)
        .map_err(|e| format!("Failed to serialize input JSON: {}", e))?;

    // Find Python and the paddle_ocr.py script
    let python = find_python_binary()?;
    let script_path = find_paddle_ocr_script()?;

    tracing::info!("Calling PaddleOCR bridge: {} {}", python, script_path.display());

    // Spawn Python subprocess
    let mut child = std::process::Command::new(&python)
        .arg(&script_path)
        .arg("--stdin")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}. Is Python installed?", e))?;

    // Write input JSON to stdin
    if let Some(ref mut stdin) = child.stdin {
        stdin
            .write_all(input_str.as_bytes())
            .map_err(|e| format!("Failed to write to Python stdin: {}", e))?;
    }

    // Read stdout
    let output = child
        .wait_with_output()
        .map_err(|e| format!("Python process failed: {}", e))?;

    // Clean up temp image
    let _ = std::fs::remove_file(&image_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        tracing::error!("PaddleOCR stderr: {}", stderr);
        return Err(format!("PaddleOCR failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let paddle_result: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse PaddleOCR JSON output: {}. Output: {}", e, stdout))?;

    // Check for errors from the Python script
    if !paddle_result.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        let error = paddle_result.get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown PaddleOCR error");
        return Err(error.to_string());
    }

    // Convert to OCRProcessResult format
    let words_array = paddle_result.get("words")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let items: Vec<OCRResultItem> = words_array
        .iter()
        .filter_map(|w| {
            let text = w.get("text")?.as_str()?.to_string();
            let confidence = w.get("confidence")?.as_f64()? as f32;
            let bbox_array = w.get("bbox")?.as_array()?;
            if bbox_array.len() < 4 {
                return None;
            }
            Some(OCRResultItem {
                text,
                confidence,
                bounding_box: BoundingBox {
                    x: bbox_array[0].as_u64()? as u32,
                    y: bbox_array[1].as_u64()? as u32,
                    width: (bbox_array[2].as_u64()? - bbox_array[0].as_u64()?) as u32,
                    height: (bbox_array[3].as_u64()? - bbox_array[1].as_u64()?) as u32,
                },
            })
        })
        .collect();

    let full_text = paddle_result.get("full_text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let avg_confidence = paddle_result.get("avg_confidence")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as f32;

    let language_detected = paddle_result.get("language_detected")
        .and_then(|v| v.as_str())
        .unwrap_or("ch")
        .to_string();

    let elapsed_ms = paddle_result.get("elapsed_ms")
        .and_then(|v| v.as_u64())
        .unwrap_or_else(|| start.elapsed().as_millis() as u64);

    let processing_time_ms = start.elapsed().as_millis() as u64;

    tracing::info!(
        "PaddleOCR completed: {} words, avg_conf={:.2}, elapsed={}ms ({}ms total)",
        items.len(), avg_confidence, elapsed_ms, processing_time_ms
    );

    Ok(OCRProcessResult {
        items,
        full_text,
        language_detected,
        processing_time_ms,
    })
}

/// Check if PaddleOCR is installed and available
#[tauri::command]
pub fn check_paddle_ocr_available() -> serde_json::Value {
    let python = match find_python_binary() {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(e) => {
            return serde_json::json!({
                "available": false,
                "error": e,
                "message": "Python not found"
            });
        }
    };

    let script_path = match find_paddle_ocr_script() {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(e) => {
            return serde_json::json!({
                "available": false,
                "error": e,
                "message": "PaddleOCR script not found",
                "python": python
            });
        }
    };

    // Run the --check command
    let output = std::process::Command::new(&python)
        .arg(&script_path)
        .arg("--check")
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            match serde_json::from_str(&stdout) {
                Ok(result) => result,
                Err(_) => serde_json::json!({
                    "available": false,
                    "error": "Failed to parse check output",
                    "raw": stdout.to_string()
                }),
            }
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            serde_json::json!({
                "available": false,
                "error": stderr.trim(),
                "message": "PaddleOCR check failed"
            })
        }
        Err(e) => serde_json::json!({
            "available": false,
            "error": e.to_string(),
            "message": "Failed to run PaddleOCR check"
        }),
    }
}

/// Find Python executable in PATH
fn find_python_binary() -> Result<PathBuf, String> {
    // Try common Python commands
    let candidates = ["python3", "python", "python3.11", "python3.10", "python3.9"];
    for cmd in candidates {
        if let Ok(path) = std::process::Command::new(cmd).arg("--version").output() {
            if path.status.success() {
                return Ok(PathBuf::from(cmd));
            }
        }
    }
    Err("Python not found in PATH. Please install Python 3.8+".to_string())
}

/// Find the paddle_ocr.py script
fn find_paddle_ocr_script() -> Result<PathBuf, String> {
    // Check multiple possible locations
    let candidates = [
        // Bundled with the app (relative to executable)
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .map(|p| p.join("scripts").join("paddle_ocr.py")),
        // Development path
        Some(std::path::PathBuf::from("src-tauri/scripts/paddle_ocr.py")),
        // Absolute development path for Agions' machine
        Some(std::path::PathBuf::from("/root/.openclaw/workspace/HardSubX/src-tauri/scripts/paddle_ocr.py")),
        // $HOME/... path
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(|p| p.join("src-tauri/scripts/paddle_ocr.py")),
    ];

    for candidate in candidates.into_iter().flatten() {
        if candidate.exists() {
            tracing::info!("Found paddle_ocr.py at: {}", candidate.display());
            return Ok(candidate);
        }
    }

    Err("paddle_ocr.py not found. Expected at: src-tauri/scripts/paddle_ocr.py".to_string())
}

/// Generate a simple UUID v4 (no external crate needed)
fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let random: u64 = (now & 0xFFFFFFFFFFFFFFFF) as u64;
    format!("{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        (now >> 96) as u32,
        ((now >> 80) & 0xFFFF) as u16,
        ((now >> 64) & 0x0FFF) as u16,
        0x8000 | ((now >> 48) & 0x3FFF) as u16,
        random
    )
}

/// Process base64-encoded image directly with OCR
#[tauri::command]
pub async fn ocr_base64_image(
    image_data: String,
    language: String,
) -> Result<OCRProcessResult, String> {
    use std::time::Instant;
    use std::io::Write;
    use std::process::Command;
    
    let start = Instant::now();
    
    // Decode base64 to image
    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;
    
    // Write to temp file
    let temp_path = std::env::temp_dir().join(format!(
        "hardsubx_ocr_{}.png",
        uuid_v4()
    ));
    
    {
        let mut file = std::fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(&image_bytes)
            .map_err(|e| format!("Failed to write image data: {}", e))?;
    }
    
    // Process with Tesseract CLI
    let result = ocr_image_tesseract(
        temp_path.to_string_lossy().to_string(),
        language,
        None,
    ).await;
    
    // Cleanup temp file
    let _ = std::fs::remove_file(&temp_path);
    
    match result {
        Ok(mut r) => {
            r.processing_time_ms = start.elapsed().as_millis() as u64;
            Ok(r)
        }
        Err(e) => Err(e)
    }
}
