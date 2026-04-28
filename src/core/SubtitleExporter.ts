/**
 * SubtitleExporter — 字幕导出引擎
 * ==================================
 * 负责将 SubtitleItem[] 序列化为各种格式。
 * Store 专注状态管理，Exporter 专注格式逻辑。
 *
 * 设计原则：
 * - 纯函数，无副作用
 * - 每个格式独立函数，可单独测试
 * - 错误格式输入 → 返回空字符串（容错）
 */

import type { SubtitleItem } from '@/types/subtitle'

// ─── 辅助函数 ─────────────────────────────────────────────────────
function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0')
}

function _decompose(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const remainder = seconds % 1
  return { h, m, s, remainder }
}

function tsSRT(seconds: number): string {
  const { h, m, s, remainder } = _decompose(seconds)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(Math.floor(remainder * 1000))}`
}

function tsVTT(seconds: number): string {
  const { h, m, s, remainder } = _decompose(seconds)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(Math.floor(remainder * 1000))}`
}

function tsASS(seconds: number): string {
  const { h, m, s, remainder } = _decompose(seconds)
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2(Math.floor(remainder * 100))}`
}

function tsSBV(seconds: number): string {
  const { h, m, s, remainder } = _decompose(seconds)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(Math.floor(remainder * 1000)).padStart(3, '0')}`
}

function tsSSA(seconds: number): string {
  const { h, m, s, remainder } = _decompose(seconds)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(Math.floor(remainder * 30))}`
}

// ─── 格式化函数 ─────────────────────────────────────────────────────
function formatSRT(subs: SubtitleItem[]): string {
  if (!subs?.length) return ''
  return subs.map((sub, i) =>
    `${i + 1}\n${tsSRT(sub.startTime)} --> ${tsSRT(sub.endTime)}\n${sub.text}`
  ).join('\n\n')
}

function formatVTT(subs: SubtitleItem[]): string {
  if (!subs?.length) return 'WEBVTT\n\n'
  const content = subs.map((sub, i) =>
    `${i + 1}\n${tsVTT(sub.startTime)} --> ${tsVTT(sub.endTime)}\n${sub.text}`
  ).join('\n\n')
  return `WEBVTT\n\n${content}`
}

const _ASS_ESCAPE_MAP = new Map([
  [/\\/g, '\\\\'],
  [/\{/g, '\\{'],
  [/\}/g, '\\}'],
  [/,/g, '\\,'],
  [/\n/g, '\\N'],
])

function formatASS(subs: SubtitleItem[]): string {
  if (!subs?.length) return ''

  const header = `[Script Info]
Title: SubLens Export
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = subs.map(sub => {
    let text = sub.text
    for (const [pattern, replacement] of _ASS_ESCAPE_MAP) {
      text = text.replace(pattern, replacement)
    }
    return `Dialogue: 0,${tsASS(sub.startTime)},${tsASS(sub.endTime)},Default,,0,0,0,,${text}`
  }).join('\n')

  return `${header}\n${events}`
}

function formatSSA(subs: SubtitleItem[]): string {
  if (!subs?.length) return ''

  const header = `[Script Info]
Title: SubLens Export
ScriptType:v4.00+
Collisions:Normal
PlayDepth:0

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Default,Arial,20,16777215,65535,255,0,-1,0,1,2,2,2,10,10,10,0,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = subs.map(sub => {
    const text = sub.text.replace(/,/g, '\\,')
    return `Dialogue: Marked=0,${tsSSA(sub.startTime)},${tsSSA(sub.endTime)},Default,NTP,0000,0000,0000,,${text}`
  }).join('\n')

  return `${header}\n${events}`
}

function formatJSON(subs: SubtitleItem[]): string {
  if (!subs?.length) return JSON.stringify({ subtitles: [], generatedAt: new Date().toISOString() })
  return JSON.stringify({
    version: '3.0',
    generatedAt: new Date().toISOString(),
    tool: 'SubLens',
    subtitles: subs.map(sub => ({
      index: sub.index,
      startTime: sub.startTime,
      endTime: sub.endTime,
      startFrame: sub.startFrame,
      endFrame: sub.endFrame,
      text: sub.text,
      confidence: sub.confidence,
      language: sub.language,
      roi: sub.roi,
    }))
  }, null, 2)
}

function formatTXT(subs: SubtitleItem[]): string {
  if (!subs?.length) return ''
  return subs.map(sub => sub.text).join('\n')
}

function formatLRC(subs: SubtitleItem[]): string {
  if (!subs?.length) return ''

  const header = `[ti:SubLens Export]
[ar:SubLens]
[al:Subtitle Export]
[by:SubLens v3.0]
[offset:0]
[re:SubLens]

`
  const content = subs.map(sub => {
    const min = Math.floor(sub.startTime / 60)
    const sec = Math.floor(sub.startTime % 60)
    const ms = Math.floor((sub.startTime % 1) * 100)
    return `[${pad2(min)}:${pad2(sec)}.${pad2(ms)}]${sub.text}`
  }).join('\n\n')

  return `${header}${content}`
}

function formatSBV(subs: SubtitleItem[]): string {
  if (!subs?.length) return ''
  return subs.map(sub =>
    `${tsSBV(sub.startTime)},${tsSBV(sub.endTime)}\n${sub.text}`
  ).join('\n\n')
}

function formatCSV(subs: SubtitleItem[]): string {
  if (!subs?.length) return 'Index,StartTime,EndTime,StartFrame,EndFrame,Text,Confidence\n'
  const header = 'Index,StartTime,EndTime,StartFrame,EndFrame,Text,Confidence\n'
  const rows = subs.map(sub => {
    const escaped = `"${sub.text.replace(/"/g, '""')}"`
    return `${sub.index},${sub.startTime.toFixed(3)},${sub.endTime.toFixed(3)},${sub.startFrame},${sub.endFrame},${escaped},${(sub.confidence * 100).toFixed(1)}%`
  }).join('\n')
  return header + rows
}

// ─── Exporter 主类 ─────────────────────────────────────────────────
export type ExportFormat = 'srt' | 'vtt' | 'ass' | 'ssa' | 'json' | 'txt' | 'lrc' | 'sbv' | 'csv'

export interface ExportResult {
  format: ExportFormat
  content: string
  filename: string
}

export class SubtitleExporter {
  private readonly FORMATTERS: Record<ExportFormat, (subs: SubtitleItem[]) => string> = {
    srt: formatSRT,
    vtt: formatVTT,
    ass: formatASS,
    ssa: formatSSA,
    json: formatJSON,
    txt: formatTXT,
    lrc: formatLRC,
    sbv: formatSBV,
    csv: formatCSV,
  }

  /**
   * 导出单格式
   */
  export(subs: SubtitleItem[], format: ExportFormat): ExportResult {
    const formatter = this.FORMATTERS[format] ?? formatTXT
    return {
      format,
      content: formatter(subs),
      filename: `subtitles.${format}`,
    }
  }

  /**
   * 批量导出多个格式
   */
  exportBatch(subs: SubtitleItem[], formats: ExportFormat[]): ExportResult[] {
    return formats.map(f => this.export(subs, f))
  }

  /**
   * 导出全部已启用的格式（传入格式开关对象）
   */
  exportAll(
    subs: SubtitleItem[],
    enabledFormats: Partial<Record<ExportFormat, boolean>>
  ): ExportResult[] {
    return (Object.keys(enabledFormats) as ExportFormat[])
      .filter(f => enabledFormats[f])
      .map(f => this.export(subs, f))
  }

  /** 获取所有支持的格式列表 */
  getSupportedFormats(): ExportFormat[] {
    return Object.keys(this.FORMATTERS) as ExportFormat[]
  }
}

// ─── 全局单例（避免重复实例化开销）─────────────────────────────────
let _instance: SubtitleExporter | null = null

export function getExporter(): SubtitleExporter {
  if (!_instance) _instance = new SubtitleExporter()
  return _instance
}
