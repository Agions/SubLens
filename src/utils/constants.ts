/**
 * Shared constants across the application
 */

// ─── Canvas ────────────────────────────────────────────────────────────
export const CANVAS_CONTEXT_2D = '2d'
export const MIME_IMAGE_PNG = 'image/png'

// ─── Storage ──────────────────────────────────────────────────────────
export const LOCALSTORAGE_SIZE_LIMIT = 5 * 1024 * 1024
export const LOCALSTORAGE_KEY_SETTINGS = 'hardsubx-settings'
export const LOCALSTORAGE_KEY_THUMBNAILS = 'hardsubx-thumbnails'
export const LOCALSTORAGE_KEY_CACHE = 'hardsubx-cache'
export const LOCALSTORAGE_KEY_TEMP = 'hardsubx-temp'

// ─── Default extract options ──────────────────────────────────────────
export const DEFAULT_OCR_ENGINE = 'paddle' as const
export const DEFAULT_LANGUAGES = ['ch'] as const
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7
export const DEFAULT_MERGE_THRESHOLD = 0.80
export const DEFAULT_SCENE_THRESHOLD = 0.3
export const DEFAULT_FRAME_INTERVAL = 1

// ─── ROI defaults ─────────────────────────────────────────────────────
export const DEFAULT_ROI_NAME = '底部字幕'
export const DEFAULT_ROI_Y = 85
export const DEFAULT_ROI_HEIGHT = 15

// ─── Export formats ───────────────────────────────────────────────────
export const EXPORT_FORMAT_KEYS = ['srt', 'vtt', 'ass', 'ssa', 'json', 'txt', 'lrc', 'sbv', 'csv'] as const
export type ExportFormatKey = typeof EXPORT_FORMAT_KEYS[number]

// ─── Error messages ──────────────────────────────────────────────────
export const ERR_NO_VIDEO = 'No video loaded'
export const ERR_OCR_NOT_READY = 'OCR engine not initialized'
export const ERR_CANVAS_CTX = 'Failed to get canvas context'
export const ERR_CANVAS_CTX_2D = 'Failed to get 2D canvas context'
