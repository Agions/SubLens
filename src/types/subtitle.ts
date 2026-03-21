// Subtitle Types
import type { ROI } from './video'

export interface SubtitleItem {
  id: string
  index: number
  startTime: number      // seconds
  endTime: number        // seconds
  startFrame: number
  endFrame: number
  text: string
  confidence: number     // 0-1
  language?: string
  roi: ROI
  thumbnailUrls: string[]
  edited: boolean         // has been manually edited
}

export interface SubtitleEdit {
  id: string
  field: 'text' | 'startTime' | 'endTime'
  oldValue: string | number
  newValue: string | number
}

export interface SubtitleExportOptions {
  format: ExportFormat
  includeThumbnails: boolean
  includeConfidence: boolean
  outputPath: string
}

export type ExportFormat = 'srt' | 'vtt' | 'ass' | 'json' | 'txt'

export interface ExportFormats {
  srt: boolean
  vtt: boolean
  ass: boolean
  json: boolean
  txt: boolean
}

// SRT Format
export function formatSRT(subtitles: SubtitleItem[]): string {
  return subtitles.map((sub, i) => {
    const start = formatTimestamp(sub.startTime, ',')
    const end = formatTimestamp(sub.endTime, ',')
    return `${i + 1}\n${start} --> ${end}\n${sub.text}\n`
  }).join('\n')
}

// VTT Format
export function formatWebVTT(subtitles: SubtitleItem[]): string {
  const header = 'WEBVTT\n\n'
  const content = subtitles.map((sub, i) => {
    const start = formatTimestamp(sub.startTime, '.')
    const end = formatTimestamp(sub.endTime, '.')
    return `${i + 1}\n${start} --> ${end}\n${sub.text}\n`
  }).join('\n')
  return header + content
}

// ASS Format (Advanced SubStation Alpha)
export function formatASS(subtitles: SubtitleItem[]): string {
  const header = `[Script Info]
Title: VisionSub Export
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = subtitles.map(sub => {
    const start = formatTimestampASS(sub.startTime)
    const end = formatTimestampASS(sub.endTime)
    const text = sub.text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}')
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  }).join('\n')

  return header + '\n' + events
}

// JSON Format (with frame mapping)
export function formatJSON(subtitles: SubtitleItem[]): string {
  return JSON.stringify({
    version: '3.0',
    generatedAt: new Date().toISOString(),
    subtitles: subtitles.map(sub => ({
      id: sub.id,
      index: sub.index,
      startTime: sub.startTime,
      endTime: sub.endTime,
      startFrame: sub.startFrame,
      endFrame: sub.endFrame,
      text: sub.text,
      confidence: sub.confidence,
      language: sub.language,
      roi: sub.roi,
      thumbnailUrls: sub.thumbnailUrls
    }))
  }, null, 2)
}

// Timestamp formatter
function formatTimestamp(seconds: number, separator: string): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
  
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}${separator}${pad(ms, 3)}`
}

// ASS timestamp formatter (h:mm:ss.cc)
function formatTimestampASS(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
  
  return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(cs)}`
}
