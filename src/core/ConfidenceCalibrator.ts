/**
 * ConfidenceCalibrator — 置信度校准引擎
 * ======================================
 * 统一所有置信度校准逻辑：
 * - 基础校准（calibrate）
 * - 增强校准（calibrateEnhanced）
 * - 文本质量检测（detectIssues）
 *
 * 校准策略：
 * - 加权乘法：quality = base * multipliers
 * - 所有乘数范围 [0.7, 1.1]，避免过度惩罚
 */

export type Script = 'chinese' | 'japanese' | 'korean' | 'latin' | 'other'

export interface CalibrationResult {
  confidence: number          // 校准后的置信度 [0, 1]
  signals: CalibrationSignal[] // 触发哪些校准信号
}

export interface CalibrationSignal {
  type: 'penalty' | 'bonus'
  factor: number              // 乘数，如 0.80
  reason: string              // 描述
}

const PENALTY = (f: number, r: string): CalibrationSignal => ({ type: 'penalty', factor: f, reason: r })
const BONUS   = (f: number, r: string): CalibrationSignal => ({ type: 'bonus',   factor: f, reason: r })

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export class ConfidenceCalibrator {
  /**
   * 基础校准（单次 OCR 识别结果）
   */
  calibrate(text: string, raw: number): CalibrationResult {
    if (!text) return { confidence: raw, signals: [] }

    const signals: CalibrationSignal[] = []
    const len = text.replace(/\s/g, '').length

    const hasChinese  = /[\u4e00-\u9fff]/.test(text)
    const hasLatin   = /[a-zA-Z]/.test(text)
    const hasDigit   = /\d/.test(text)
    const scriptCount = [hasChinese, hasLatin, hasDigit].filter(Boolean).length

    let quality = raw

    // 脚本混用惩罚
    if (scriptCount >= 2) {
      const factor = 0.80
      quality *= factor
      signals.push(PENALTY(factor, 'mixed scripts detected'))
    }

    // 文本过短惩罚
    if (len > 0 && len <= 2) {
      const factor = 0.85
      quality *= factor
      signals.push(PENALTY(factor, 'text too short (<3 chars)'))
    }

    // 重复字符惩罚
    if (/(.)\1{3,}/.test(text)) {
      const factor = 0.75
      quality *= factor
      signals.push(PENALTY(factor, 'repeated character pattern'))
    }

    // 字符多样性奖励（正常文本 unique ratio 在 0.6-0.95）
    const unique = new Set(text.replace(/\s/g, '')).size
    const ratio = len > 0 ? unique / len : 1
    if (ratio > 0.6 && ratio < 0.95) {
      const factor = 1.05
      quality = Math.min(1, quality * factor)
      signals.push(BONUS(factor, 'healthy character diversity'))
    }

    return { confidence: clamp(quality), signals }
  }

  /**
   * 增强校准（多通道 OCR / 后处理后的最终结果）
   * 包含语言特定规则和更多质量信号。
   */
  calibrateEnhanced(text: string, raw: number, script: Script = 'other'): CalibrationResult {
    if (!text) return { confidence: raw, signals: [] }

    const signals: CalibrationSignal[] = []
    const trimmed = text.trim()
    const len = trimmed.length

    // 基础校准
    const base = this.calibrate(trimmed, raw)
    let quality = base.confidence
    signals.push(...base.signals)

    // ── CJK 规则（中文/日文/韩文）──────────────────────────
    if (script === 'chinese' || script === 'japanese' || script === 'korean') {
      // Unicode扩展区B（U+20000-U+2A6DF）已在正则覆盖
      // 孤立 CJK 单字检测
      if (/[\u4e00-\u9fff\u20000-\u2a6df]/.test(text) && / [\u4e00-\u9fff\u20000-\u2a6df]/.test(text)) {
        const factor = 0.80
        quality *= factor
        signals.push(PENALTY(factor, 'orphaned CJK character'))
      }

      // 引号不平衡（单双引号各自计数）
      const dq = (text.match(/"/g) || []).length
      const sq = (text.match(/'/g) || []).length
      if (dq % 2 !== 0 || sq % 2 !== 0) {
        const factor = 0.90
        quality *= factor
        signals.push(PENALTY(factor, 'unbalanced quotation marks'))
      }
    } else {
      // All-caps penalty: text is uppercase and contains at least one lowercase letter
      // (catches OCR errors where mixed-case was read as all-caps)
      // trim() normalizes, so check on trimmed: 'HELLo' is mixed case not all-caps
      const upperOnly = trimmed.replace(/[^A-Z]/g, '')
      if (upperOnly.length >= 4 && /[a-z]/.test(trimmed)) {
        const factor = 0.82
        quality *= factor
        signals.push(PENALTY(factor, 'all-caps (likely OCR error)'))
      }

      // 孤立数字片段
      if (/ \d{1,3} /.test(text)) {
        const factor = 0.88
        quality *= factor
        signals.push(PENALTY(factor, 'isolated digit fragment'))
      }

      // 正确句子结尾奖励
      if (/[.!?]$/.test(trimmed)) {
        const factor = 1.03
        quality = Math.min(1, quality * factor)
        signals.push(BONUS(factor, 'proper sentence ending'))
      }

      // 尾随逗号（不完整句子）
      if (/[,;]\s*$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
        const factor = 0.88
        quality *= factor
        signals.push(PENALTY(factor, 'trailing comma (incomplete sentence)'))
      }
    }

    // ── 通用规则 ──────────────────────────────────────────
    // 重复标点惩罚
    if (/[、,\.。\-_]{3,}$/.test(text)) {
      const factor = 0.85
      quality *= factor
      signals.push(PENALTY(factor, 'repeated trailing punctuation'))
    }

    // 长度合理奖励
    if (len >= 5 && len <= 120) {
      const factor = 1.04
      quality = Math.min(1, quality * factor)
      signals.push(BONUS(factor, 'reasonable subtitle length'))
    }
    if (len > 200) {
      const factor = 0.92
      quality *= factor
      signals.push(PENALTY(factor, 'suspiciously long subtitle'))
    }

    // 开头空格/标点惩罚
    if (/^[\s,.!?;:]/.test(trimmed)) {
      const factor = 0.90
      quality *= factor
      signals.push(PENALTY(factor, 'leading whitespace or punctuation'))
    }

    return { confidence: clamp(quality), signals }
  }

  /**
   * 检测文本质量问题（用于 UI 提示）
   */
  detectIssues(text: string): Array<{ issue: string; suggestion: string }> {
    const issues: Array<{ issue: string; suggestion: string }> = []
    const trimmed = text.trim()
    if (!trimmed.length) return issues

    if (/[\uff00-\uffef]/.test(trimmed)) {
      issues.push({ issue: 'Contains full-width characters', suggestion: 'Convert to half-width' })
    }

    const openBr  = (trimmed.match(/[\(\[\{]/g) || []).length
    const closeBr = (trimmed.match(/[\)\]\}]/g) || []).length
    if (openBr !== closeBr) {
      issues.push({ issue: `Unbalanced brackets (${openBr} open / ${closeBr} close)`, suggestion: 'Fix bracket pairing' })
    }

    if (/[,;]$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
      issues.push({ issue: 'Text ends with comma — may be incomplete', suggestion: 'Verify source frame' })
    }

    if (/(.)\1{4,}/.test(trimmed)) {
      issues.push({ issue: 'Detected repeated character pattern', suggestion: 'Likely OCR error' })
    }

    return issues
  }
}

// ─── 语言码 → Script 类型映射 ─────────────────────────────────
/** Map ISO 639-1/B script codes to Script enum */
export function langToScript(lang: string): Script {
  if (['zh', 'chi', 'ch', 'zho'].includes(lang)) return 'chinese'
  if (['ja', 'jpn', 'jap'].includes(lang)) return 'japanese'
  if (['ko', 'kor', 'korean'].includes(lang)) return 'korean'
  if (['en', 'eng', 'latin'].includes(lang)) return 'latin'
  return 'other'
}

// ─── 全局单例 ─────────────────────────────────────────────────────
let _calibrator: ConfidenceCalibrator | null = null

export function getCalibrator(): ConfidenceCalibrator {
  if (!_calibrator) _calibrator = new ConfidenceCalibrator()
  return _calibrator
}
