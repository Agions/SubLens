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

export type EditableField = 'text' | 'startTime' | 'endTime'
export type EditableValue = string | number

export interface SubtitleEdit {
  id: string
  field: EditableField
  oldValue: EditableValue
  newValue: EditableValue
}

export interface SubtitleExportOptions {
  format: ExportFormat
  includeThumbnails: boolean
  includeConfidence: boolean
  outputPath: string
}

export type ExportFormat = 'srt' | 'vtt' | 'ass' | 'ssa' | 'json' | 'txt' | 'lrc' | 'sbv' | 'csv'

export interface ExportFormats {
  srt: boolean
  vtt: boolean
  ass: boolean
  ssa: boolean
  json: boolean
  txt: boolean
  lrc: boolean
  sbv: boolean
  csv: boolean
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
Title: HardSubX Export
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
    // ASS escape rules:
    // \n = line break (soft)
    // \N = line break (hard, preferred)
    // \, = literal comma (commas are delimiters in Dialogue lines)
    // \h = non-breaking space
    // \{ and \} = literal braces
    // \\ = literal backslash
    const text = sub.text
        .replace(/\\/g, '\\\\')       // Escape backslashes first
        .replace(/\{/g, '\\{')         // Escape opening braces
        .replace(/\}/g, '\\}')         // Escape closing braces
        .replace(/,/g, '\\,')          // Escape commas
        .replace(/\n/g, '\\N')         // Convert newlines to \N
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  }).join('\n')

  return header + '\n' + events
}

// JSON Format (with frame mapping)
export function formatJSON(subtitles: SubtitleItem[]): string {
  return JSON.stringify({
    version: '3.0',
    generatedAt: new Date().toISOString(),
    tool: 'HardSubX',
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

// LRC Format (Lyrics)
export function formatLRC(subtitles: SubtitleItem[]): string {
  const header = `[ti:HardSubX Export]
[ar:HardSubX]
[al:Subtitle Export]
[by:HardSubX v3.0]
[offset:0]
[re:HardSubX]

`
  const content = subtitles.map(sub => {
    const minutes = Math.floor(sub.startTime / 60)
    const seconds = Math.floor(sub.startTime % 60)
    const ms = Math.floor((sub.startTime % 1) * 100)
    const timestamp = `${pad2(minutes)}:${pad2(seconds)}.${pad2(ms)}`
    return `[${timestamp}]${sub.text}`
  }).join('\n\n')

  return header + content
}

// SBV Format (YouTube captions)
export function formatSBV(subtitles: SubtitleItem[]): string {
  return subtitles.map((sub, i) => {
    const start = formatTimestampSBV(sub.startTime)
    const end = formatTimestampSBV(sub.endTime)
    return `${start},${end}\n${sub.text}\n`
  }).join('\n')
}

// SSA Format (SubStation Alpha - older version)
export function formatSSA(subtitles: SubtitleItem[]): string {
  const header = `[Script Info]
Title:HardSubX Export
ScriptType:v4.00+
Collisions:Normal
PlayDepth:0

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Default,Arial,20,16777215,65535,255,0,-1,0,1,2,2,2,10,10,10,0,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = subtitles.map(sub => {
    const start = formatTimestampSSA(sub.startTime)
    const end = formatTimestampSSA(sub.endTime)
    const text = sub.text.replace(/\\,/g, '\\,')
    return `Dialogue: Marked=0,${start},${end},Default,NTP,0000,0000,0000,,${text}`
  }).join('\n')

  return header + '\n' + events
}

// CSV Format (Comma-separated values)
export function formatCSV(subtitles: SubtitleItem[]): string {
  const header = 'Index,StartTime,EndTime,StartFrame,EndFrame,Text,Confidence\n'
  const rows = subtitles.map(sub => {
    const escapedText = `"${sub.text.replace(/"/g, '""')}"`
    return `${sub.index},${sub.startTime.toFixed(3)},${sub.endTime.toFixed(3)},${sub.startFrame},${sub.endFrame},${escapedText},${(sub.confidence * 100).toFixed(1)}%`
  }).join('\n')
  return header + rows
}

// STL Format (Spruce Subtitle Format)
export function formatSTL(subtitles: SubtitleItem[]): string {
  // Simple text-based representation for STL
  const header = `FORMAT1|00:00:00:00|00:00:00:00|E|HardSubX Export|
`
  const content = subtitles.map((sub, i) => {
    const start = formatTimestampSTL(sub.startTime)
    const end = formatTimestampSTL(sub.endTime)
    return `${pad3(i + 1)}|${start}|${end}|${sub.text.replace(/\|/g, '\\P')}`
  }).join('\n')
  return header + content
}

// TTML Format (Timed Text Markup Language)
export function formatTTML(subtitles: SubtitleItem[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="zh-CN">
<head>
  <metadata>
    <title>HardSubX Export</title>
  </metadata>
  <styling>
    <style id="default" tts:fontFamily="Arial" tts:fontSize="20" tts:color="white"/>
  </styling>
</head>
<body>
  <div>
`

  const content = subtitles.map(sub => {
    const start = formatTimestampTTML(sub.startTime)
    const end = formatTimestampTTML(sub.endTime)
    return `    <p begin="${start}" end="${end}">${escapeXml(sub.text)}</p>`
  }).join('\n')

  const footer = `  </div>
</body>
</tt>`

  return header + '\n' + content + '\n' + footer
}

// Plain Text with timing
export function formatTextWithTime(subtitles: SubtitleItem[]): string {
  return subtitles.map(sub => {
    const start = formatTimestampText(sub.startTime)
    return `[${start}] ${sub.text}`
  }).join('\n\n')
}

// Helper functions
function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0')
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatTimestampSBV(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)},${ms.toString().padStart(3, '0')}`
}

function formatTimestampSSA(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const frms = Math.floor((seconds % 1) * 30)
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}:${pad2(frms)}`
}

function formatTimestampSTL(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const frms = Math.floor((seconds % 1) * 25)
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}:${pad2(frms)}`
}

function formatTimestampTTML(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}.${ms.toString().padStart(3, '0')}`
}

function formatTimestampText(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${pad2(mins)}:${pad2(secs)}`
  }
  return `${mins}:${pad2(secs)}`
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
