#!/usr/bin/env python3
"""
VisionSub PaddleOCR Bridge
Receives image path + config via stdin JSON, outputs OCR result as JSON.

Usage:
    python paddle_ocr.py < image.json > result.json

    Or via subprocess with temp file:
    python paddle_ocr.py --image /path/to/image.png --lang ch --gpu false

Input JSON:
    {
        "image_path": "/path/to/image.png",   # absolute path to image
        "roi": {"x": 0, "y": 80, "width": 100, "height": 20},  # optional, in percent
        "language": "ch",                    # ch, en, ja, ko, fr, de, etc.
        "use_gpu": false,
        "image_data": "base64...",           # optional alternative to image_path
        "return_words": true                  # return per-word results
    }

Output JSON:
    {
        "success": true,
        "words": [
            {"text": "字幕", "confidence": 0.95, "bbox": [x0, y0, x1, y1]}
        ],
        "full_text": "字幕内容",
        "avg_confidence": 0.93,
        "engine": "paddle",
        "elapsed_ms": 150,
        "language_detected": "ch"
    }
"""

import sys
import json
import time
import argparse
import base64
import os
import tempfile
from pathlib import Path

def run_paddleocr(image_path: str, language: str = "ch", use_gpu: bool = False, 
                  return_words: bool = True):
    """
    Run PaddleOCR on the given image and return structured results.
    """
    try:
        from paddleocr import PaddleOCR
    except ImportError:
        return {
            "success": False,
            "error": "PaddleOCR not installed. Run: pip install paddlepaddle paddleocr",
            "engine": "paddle",
            "elapsed_ms": 0
        }
    
    start = time.time()
    
    # Normalize language parameter
    lang_map = {
        "ch": "ch", "chi": "ch", "chi_sim": "ch", "chi_tra": "ch_tra",
        "en": "en", "eng": "en",
        "ja": "ja", "jpn": "ja",
        "ko": "ko", "kor": "ko",
        "fr": "fr", "fra": "fr",
        "de": "de", "deu": "de",
        "es": "es", "spa": "es",
        "pt": "pt", "por": "pt",
        "it": "it", "ita": "it",
        "ru": "ru",
        "ar": "ar",
    }
    lang = lang_map.get(language.lower(), "ch")
    
    # Initialize PaddleOCR
    # use_angle_cls=True: detect text direction
    # lang: ch, en, japan, korean, french, german, spanish, portuguese, italian, russian, arabic
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang=lang,
        use_gpu=use_gpu,
        show_log=False,  # suppress verbose logging
    )
    
    # Run OCR
    result = ocr.ocr(image_path, cls=True)
    
    elapsed_ms = int((time.time() - start) * 1000)
    
    if result is None or len(result) == 0:
        return {
            "success": True,
            "words": [],
            "full_text": "",
            "avg_confidence": 0.0,
            "engine": "paddle",
            "elapsed_ms": elapsed_ms,
            "language_detected": lang
        }
    
    words = []
    full_text_parts = []
    confidences = []
    
    # PaddleOCR returns: [[[x1,y1],[x2,y2],[x3,y3],[x4,y4]], ("text", confidence)]
    for line in result:
        if line is None:
            continue
        for item in line:
            if item is None or len(item) < 2:
                continue
            
            bbox = item[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            text_info = item[1]  # ("text", confidence)
            
            if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                text = str(text_info[0])
                confidence = float(text_info[1])
            else:
                continue
            
            if not text.strip():
                continue
            
            # Calculate bounding box (axis-aligned)
            xs = [p[0] for p in bbox]
            ys = [p[1] for p in bbox]
            x0 = min(xs)
            y0 = min(ys)
            x1 = max(xs)
            y1 = max(ys)
            
            words.append({
                "text": text,
                "confidence": round(confidence, 4),
                "bbox": [int(x0), int(y0), int(x1), int(y1)]
            })
            
            full_text_parts.append(text)
            confidences.append(confidence)
    
    full_text = " ".join(full_text_parts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    
    return {
        "success": True,
        "words": words,
        "full_text": full_text,
        "avg_confidence": round(avg_confidence, 4),
        "engine": "paddle",
        "elapsed_ms": elapsed_ms,
        "language_detected": lang
    }


def check_paddleocr_available():
    """Check if PaddleOCR is installed and return info."""
    try:
        import paddle
        from paddleocr import PaddleOCR
        ocr_version = "unknown"
        paddle_version = paddle.__version__
        
        # Test basic initialization (no GPU, just check imports)
        try:
            test_ocr = PaddleOCR(use_gpu=False, use_angle_cls=True, lang='en', show_log=False)
            return {
                "available": True,
                "paddle_version": paddle_version,
                "ocr_version": ocr_version,
                "gpu_available": False,  # Will be redetected at runtime
                "message": "PaddleOCR is ready"
            }
        except Exception as e:
            return {
                "available": False,
                "error": str(e),
                "message": "PaddleOCR importable but failed to initialize"
            }
    except ImportError as e:
        return {
            "available": False,
            "error": f"Import error: {e}",
            "message": "PaddleOCR not installed. Run: pip install paddlepaddle paddleocr"
        }


def main():
    parser = argparse.ArgumentParser(description="VisionSub PaddleOCR Bridge")
    parser.add_argument("--image", type=str, help="Path to image file")
    parser.add_argument("--lang", type=str, default="ch", help="Language code (ch/en/ja/ko/fr/de/es/pt/it/ru/ar)")
    parser.add_argument("--gpu", type=str, default="false", help="Use GPU (true/false)")
    parser.add_argument("--return-words", type=str, default="true", help="Return per-word results")
    parser.add_argument("--check", action="store_true", help="Check PaddleOCR availability and exit")
    parser.add_argument("--stdin", action="store_true", help="Read config from stdin JSON")
    
    args = parser.parse_args()
    
    # Check mode
    if args.check:
        result = check_paddleocr_available()
        print(json.dumps(result, ensure_ascii=False))
        return
    
    # Stdin mode
    if args.stdin:
        try:
            config = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}))
            sys.exit(1)
        
        image_path = config.get("image_path", "")
        image_data_b64 = config.get("image_data", "")
        language = config.get("language", "ch")
        use_gpu = config.get("use_gpu", False)
        return_words = config.get("return_words", True)
        roi = config.get("roi", None)
        
        # Handle ROI cropping — always clean up temp file even on error
        base64_temp_path = None  # Track base64-derived temp separately
        roi_temp_path = None     # Track ROI-cropped temp separately
        if image_path and roi:
            try:
                from PIL import Image
                img = Image.open(image_path)
                w, h = img.size
                # ROI in percent
                x = int(roi.get("x", 0) / 100 * w)
                y = int(roi.get("y", 0) / 100 * h)
                rw = int(roi.get("width", 100) / 100 * w)
                rh = int(roi.get("height", 20) / 100 * h)
                cropped = img.crop((x, y, min(x+rw, w), min(y+rh, h)))
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    cropped.save(tmp.name)
                    roi_temp_path = tmp.name
                image_path = roi_temp_path
            except Exception as e:
                # Clean up temp file on error before exiting
                if roi_temp_path:
                    try: os.unlink(roi_temp_path)
                    except: pass
                print(json.dumps({"success": False, "error": f"ROI cropping failed: {e}"}))
                sys.exit(1)

        # Handle base64 image data — always clean up temp file even on error
        if not image_path and image_data_b64:
            try:
                img_bytes = base64.b64decode(image_data_b64)
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    tmp.write(img_bytes)
                    base64_temp_path = tmp.name
                image_path = base64_temp_path
            except Exception as e:
                if base64_temp_path:
                    try: os.unlink(base64_temp_path)
                    except: pass
                print(json.dumps({"success": False, "error": f"Base64 decode failed: {e}"}))
                sys.exit(1)

        result = run_paddleocr(image_path, language, use_gpu, return_words)

        # Clean up temp files — both ROI-cropped and base64-derived temps
        for tmp_path in [roi_temp_path, base64_temp_path]:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass  # Best-effort

        print(json.dumps(result, ensure_ascii=False))
        return
    
    # Direct mode (args)
    if not args.image:
        print(json.dumps({"success": False, "error": "No image specified. Use --image or --stdin"}))
        sys.exit(1)
    
    use_gpu = args.gpu.lower() in ("true", "1", "yes")
    return_words = args.return_words.lower() in ("true", "1", "yes")
    
    result = run_paddleocr(args.image, args.lang, use_gpu, return_words)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
