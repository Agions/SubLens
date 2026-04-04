// Video Types

export interface VideoMetadata {
  path: string
  width: number
  height: number
  duration: number
  fps: number
  totalFrames: number
  codec: string
}

export interface Frame {
  index: number
  timestamp: number
  width: number
  height: number
  data?: Uint8Array
  thumbnailUrl?: string
}

export interface ROIPreset {
  id: string
  name: string
  icon: string
  rect: ROI
}

export const ROI_PRESETS: ROIPreset[] = [
  { id: 'bottom', name: '底部字幕', icon: '⬇️', rect: { id: 'bottom', name: '底部字幕', type: 'bottom', x: 0, y: 85, width: 100, height: 15, unit: 'percent', enabled: true } },
  { id: 'top', name: '顶部字幕', icon: '⬆️', rect: { id: 'top', name: '顶部字幕', type: 'top', x: 0, y: 0, width: 100, height: 15, unit: 'percent', enabled: true } },
  { id: 'left', name: '左侧字幕', icon: '⬅️', rect: { id: 'left', name: '左侧字幕', type: 'left', x: 0, y: 30, width: 40, height: 40, unit: 'percent', enabled: true } },
  { id: 'right', name: '右侧字幕', icon: '➡️', rect: { id: 'right', name: '右侧字幕', type: 'right', x: 60, y: 30, width: 40, height: 40, unit: 'percent', enabled: true } },
  { id: 'center', name: '中心字幕', icon: '⭕', rect: { id: 'center', name: '中心字幕', type: 'center', x: 20, y: 40, width: 60, height: 20, unit: 'percent', enabled: true } },
]

export interface ROI {
  id: string
  name: string
  type: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'custom'
  x: number
  y: number
  width: number
  height: number
  unit: 'percent' | 'pixel'
  enabled: boolean
}

export interface ExtractOptions {
  ocrEngine: OCREngine
  languages: string[]
  confidenceThreshold: number
  // Advanced OCR
  multiPass: boolean
  postProcess: boolean
  mergeSubtitles: boolean
  mergeThreshold: number   // similarity threshold 0-1
  // Frame processing
  sceneThreshold: number   // 0-1, chi-square threshold for scene detection
  frameInterval: number     // process every N frames
}

export type OCREngine = 'paddle' | 'easyocr' | 'tesseract'

export interface OCRConfig {
  engine: OCREngine
  language: string[]
  confidenceThreshold: number
}

/**
 * Confidence level thresholds (unified across UI and filter).
 * High: ≥ 85% — reliable, auto-accepted
 * Mid:  60–85% — needs review
 * Low:  < 60% — likely OCR error, batch-delete candidate
 */
export const CONFIDENCE_HIGH = 0.85
export const CONFIDENCE_MID = 0.60

export type ConfidenceLevel = 'high' | 'mid' | 'low'

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_HIGH) return 'high'
  if (confidence >= CONFIDENCE_MID) return 'mid'
  return 'low'
}
