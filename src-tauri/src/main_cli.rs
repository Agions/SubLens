//! SubLens CLI - Command Line Interface
//! 
//! Usage:
//!   hardsubx-cli extract <video_file> [options]
//!   hardsubx-cli preview <video_file> --frame <frame_number>
//!   hardsubx-cli info <video_file>

use clap::{Parser, Subcommand};
use std::path::Path;
use std::process::Command;

#[derive(Parser)]
#[command(
    name = "hardsubx-cli",
    version = "3.2.0",
    about = "SubLens v3.2.0 - Video Subtitle Extraction Tool"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Extract subtitles from video
    Extract {
        /// Video file path
        video: String,
        
        /// Output directory
        #[arg(short, long, default_value = "./")]
        output: String,
        
        /// Export formats (srt, vtt, ass, json, txt)
        #[arg(short, long, default_value = "srt")]
        format: String,
        
        /// ROI preset (bottom, top, left, right, center, custom)
        #[arg(short, long, default_value = "bottom")]
        roi: String,
        
        /// OCR engine (paddle, easyocr, tesseract)
        #[arg(short, long, default_value = "paddle")]
        ocr: String,
        
        /// Languages (e.g., ch, en, ja, ko)
        #[arg(short, long, default_value = "ch")]
        lang: String,
        
        /// Scene detection threshold
        #[arg(long, default_value_t = 0.3)]
        threshold: f32,
    },
    
    /// Preview frame OCR result
    Preview {
        /// Video file path
        video: String,
        
        /// Frame number to preview
        #[arg(long)]
        frame: u64,
        
        /// ROI preset
        #[arg(short, long, default_value = "bottom")]
        roi: String,
    },
    
    /// Show video information
    Info {
        /// Video file path
        video: String,
    },
}

fn main() {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Extract { 
            video, output, format, roi, ocr, lang, threshold 
        } => {
            println!("🎬 SubLens CLI v3.2.0");
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("📁 Input: {}", video);
            println!("📂 Output: {}", output);
            println!("🎯 ROI: {}", roi);
            println!("🔧 OCR: {} | Lang: {}", ocr, lang);
            println!("⏳ Scene threshold: {}", threshold);
            
            // Check if video file exists
            if !Path::new(&video).exists() {
                eprintln!("❌ Error: Video file not found: {}", video);
                std::process::exit(1);
            }
            
            // CLI extraction requires native OCR integration
            // For now, provide guidance on using the GUI
            println!("\n⚠️  Native CLI extraction requires PaddleOCR/EasyOCR integration.");
            println!("   For full functionality, please use the GUI application.");
            println!("   Or use Tesseract.js via the web interface.");
        },
        
        Commands::Preview { video, frame, roi } => {
            println!("🔍 Preview frame #{} from {}", frame, video);
            println!("🎯 ROI: {}", roi);
            
            if !Path::new(&video).exists() {
                eprintln!("❌ Error: Video file not found: {}", video);
                std::process::exit(1);
            }
            
            // Extract frame using ffmpeg if available
            match extract_frame_ffmpeg(&video, frame) {
                Ok(_) => println!("✅ Frame extracted successfully"),
                Err(e) => {
                    eprintln!("❌ Failed to extract frame: {}", e);
                    std::process::exit(1);
                }
            }
        },
        
        Commands::Info { video } => {
            if !Path::new(&video).exists() {
                eprintln!("❌ Error: Video file not found: {}", video);
                std::process::exit(1);
            }
            
            match get_video_info_ffprobe(&video) {
                Ok(info) => {
                    println!("📋 Video Information");
                    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    println!("📁 File: {}", video);
                    println!("📐 Resolution: {}x{}", info.0, info.1);
                    println!("⏱️  Duration: {:.2}s", info.2);
                    println!("🎬 FPS: {:.2}", info.3);
                    println!("🧮 Total Frames: {}", info.4);
                    println!("🎨 Codec: {}", info.5);
                },
                Err(e) => {
                    eprintln!("❌ Failed to get video info: {}", e);
                    eprintln!("   (ffprobe may not be installed)");
                    // Fallback to basic file info
                    if let Ok(meta) = std::fs::metadata(&video) {
                        println!("📋 Basic File Information");
                        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                        println!("📁 File: {}", video);
                        println!("💾 Size: {:.2} MB", meta.len() as f64 / 1_000_000.0);
                        println!("⚠️  Detailed info requires ffprobe");
                    }
                    std::process::exit(1);
                }
            }
        },
    }
}

/// Get video information using ffprobe
fn get_video_info_ffprobe(path: &str) -> Result<(u32, u32, f64, f64, u64, String), String> {
    let output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            path
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;
    
    if !output.status.success() {
        return Err("ffprobe exited with error".to_string());
    }
    
    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    
    // Find video stream
    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        })
        .ok_or("No video stream found")?;
    
    let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
    
    // Parse frame rate
    let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("30/1");
    let fps_parts: Vec<&str> = fps_str.split('/').collect();
    let fps = if fps_parts.len() == 2 {
        let num: f64 = fps_parts[0].parse().unwrap_or(30.0);
        let den: f64 = fps_parts[1].parse().unwrap_or(1.0);
        if den > 0.0 { num / den } else { 30.0 }
    } else {
        fps_str.parse().unwrap_or(30.0)
    };
    
    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);
    
    let codec = video_stream["codec_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    
    let total_frames = if duration > 0.0 && fps > 0.0 {
        (duration * fps) as u64
    } else {
        video_stream["nb_frames"].as_u64().unwrap_or(0)
    };
    
    Ok((width, height, duration, fps, total_frames, codec))
}

/// Extract a specific frame using ffmpeg
fn extract_frame_ffmpeg(path: &str, frame_num: u64) -> Result<(), String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    
    // Generate unique temp filename
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temp_path = std::env::temp_dir().join(format!("hardsubx_preview_{}.png", now));
    
    // Get video FPS to calculate timestamp
    let fps = match get_video_info_ffprobe(path) {
        Ok((_, _, _, f, _, _)) => f,
        Err(_) => 30.0,
    };
    
    let timestamp = frame_num as f64 / fps;
    
    let output = Command::new("ffmpeg")
        .args([
            "-ss", &format!("{}", timestamp),
            "-i", path,
            "-vframes", "1",
            "-q:v", "2",
            temp_path.to_str().unwrap()
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    if !output.status.success() {
        return Err("ffmpeg failed to extract frame".to_string());
    }
    
    println!("📷 Frame saved to: {:?}", temp_path);
    
    // Clean up temp file after a short delay (don't wait)
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(60));
        let _ = std::fs::remove_file(&temp_path);
    });
    
    Ok(())
}
