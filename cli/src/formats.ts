/**
 * Subtitle format exporters.
 * Ported from Vue src/types/subtitle.ts
 */

export interface SubtitleItem {
  id: string
  index: number
  startTime: number   // seconds
  endTime: number     // seconds
  startFrame: number
  endFrame: number
  text: string
  confidence: number  // 0-1
  language?: string
  edited?: boolean
}

function pad2(n: number): string {
  return Math.ceil(n).toString().padStart(2, '0')
}

function pad3(n: number): string {
  return Math.ceil(n).toString().padStart(3, '0')
}

function formatTimestampSRT(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`
}

function formatTimestampASS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.round((seconds % 1) * 100)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`
}

// ── SRT ──────────────────────────────────────────────────────────────────────

export function formatSRT(subs: SubtitleItem[]): string {
  return subs.map((s, i) => {
    const start = formatTimestampSRT(s.startTime)
    const end = formatTimestampSRT(s.endTime)
    return `${i + 1}\n${start} --> ${end}\n${s.text}\n`
  }).join('\n')
}

// ── WebVTT ──────────────────────────────────────────────────────────────────

export function formatWebVTT(subs: SubtitleItem[]): string {
  const header = 'WEBVTT\n\n'
  const entries = subs.map((s, i) => {
    const start = formatTimestampSRT(s.startTime).replace(',', '.')
    const end = formatTimestampSRT(s.endTime).replace(',', '.')
    return `${i + 1}\n${start} --> ${end}\n${s.text}\n`
  }).join('\n')
  return header + entries
}

// ── ASS ─────────────────────────────────────────────────────────────────────

export function formatASS(subs: SubtitleItem[]): string {
  const header = `[Script Info]
Title: HardSubX Export
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  const events = subs.map((s, i) => {
    const start = formatTimestampASS(s.startTime)
    const end = formatTimestampASS(s.endTime)
    const text = s.text.replace(/\n/g, '\\N')
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  }).join('\n')

  return header + events
}

// ── SSA ─────────────────────────────────────────────────────────────────────

export function formatSSA(subs: SubtitleItem[]): string {
  const header = `[Script Info]
Title: HardSubX Export
ScriptType: v4.00
Collisions: Normal

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,16777215,255,0,0,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  const events = subs.map((s, i) => {
    const start = formatTimestampASS(s.startTime)
    const end = formatTimestampASS(s.endTime)
    const text = s.text.replace(/\n/g, '\\N')
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  }).join('\n')

  return header + events
}

// ── JSON ─────────────────────────────────────────────────────────────────────

export interface JSONExport {
  version: string
  exportedAt: string
  total: number
  subtitles: Array<{
    index: number
    startTime: number
    endTime: number
    startFrame: number
    endFrame: number
    duration: number
    text: string
    confidence: number
    language?: string
  }>
}

export function formatJSON(subs: SubtitleItem[]): string {
  const exportData: JSONExport = {
    version: '3.1.1',
    exportedAt: new Date().toISOString(),
    total: subs.length,
    subtitles: subs.map(s => ({
      index: s.index,
      startTime: Math.round(s.startTime * 1000) / 1000,
      endTime: Math.round(s.endTime * 1000) / 1000,
      duration: Math.round((s.endTime - s.startTime) * 1000) / 1000,
      startFrame: s.startFrame,
      endFrame: s.endFrame,
      text: s.text,
      confidence: Math.round(s.confidence * 100) / 100,
      language: s.language,
    })),
  }
  return JSON.stringify(exportData, null, 2)
}

// ── LRC ─────────────────────────────────────────────────────────────────────

function formatTimestampLRC(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 100)
  return `[${pad2(m)}:${pad2(s)}.${pad2(ms)}]`
}

export function formatLRC(subs: SubtitleItem[]): string {
  return subs.map(s =>
    `${formatTimestampLRC(s.startTime)}${s.text}`
  ).join('\n')
}

// ── SBV (YouTube) ─────────────────────────────────────────────────────────────

function formatTimestampSBV(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}`
}

export function formatSBV(subs: SubtitleItem[]): string {
  return subs.map((s, i) => {
    const start = formatTimestampSBV(s.startTime)
    const end = formatTimestampSBV(s.endTime)
    return `${start},${end}\n${s.text}\n`
  }).join('\n')
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function formatCSV(subs: SubtitleItem[]): string {
  const header = 'index,start_time,end_time,start_frame,end_frame,duration,text,confidence,language\n'
  const rows = subs.map(s => {
    const duration = Math.round((s.endTime - s.startTime) * 1000) / 1000
    const text = `"${s.text.replace(/"/g, '""')}"`
    return `${s.index},${s.startTime.toFixed(3)},${s.endTime.toFixed(3)},${s.startFrame},${s.endFrame},${duration.toFixed(3)},${text},${s.confidence.toFixed(2)},${s.language ?? ''}`
  }).join('\n')
  return header + rows
}

// ── TXT ─────────────────────────────────────────────────────────────────────

export function formatTXT(subs: SubtitleItem[]): string {
  return subs.map(s => s.text).join('\n')
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export type ExportFormat = 'srt' | 'vtt' | 'ass' | 'ssa' | 'json' | 'txt' | 'lrc' | 'sbv' | 'csv'

export const FORMATTERS: Record<ExportFormat, (subs: SubtitleItem[]) => string> = {
  srt: formatSRT,
  vtt: formatWebVTT,
  ass: formatASS,
  ssa: formatSSA,
  json: formatJSON,
  txt: formatTXT,
  lrc: formatLRC,
  sbv: formatSBV,
  csv: formatCSV,
}

export const FORMAT_NAMES: Record<ExportFormat, string> = {
  srt: 'SubRip (.srt)',
  vtt: 'WebVTT (.vtt)',
  ass: 'Advanced SubStation Alpha (.ass)',
  ssa: 'SubStation Alpha (.ssa)',
  json: 'JSON with frame mapping (.json)',
  txt: 'Plain text (.txt)',
  lrc: 'Lyrics (.lrc)',
  sbv: 'YouTube subtitle (.sbv)',
  csv: 'Comma-separated values (.csv)',
}
