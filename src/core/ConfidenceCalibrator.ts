/**
 * ConfidenceCalibrator — 置信度校准引擎
 * ========================================
 * 统一所有置信度校准逻辑：
 * - 基础校准（calibrate）
 * - 增强校准（calibrateEnhanced）
 * - 文本质量检测（detectIssues）
 *
 * 校准策略：
 * - 加权乘法：quality = base * multipliers
 * - 所有乘数范围 [0.7, 1.1]，避免过度惩罚
 */

import { clamp } from '@/utils/math'

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

// ── Quality factor constants
const F_MIXED_SCRIPTS    = 0.80
const F_TEXT_TOO_SHORT   = 0.85
const F_REPEATED_CHAR    = 0.75
const F_CHAR_DIVERSITY   = 1.05
const F_ORPHANED_CJK     = 0.80
const F_UNBALANCED_QUOTE = 0.90
const F_ALL_CAPS         = 0.82
const F_ISOLATED_DIGIT   = 0.88
const F_SENTENCE_END     = 1.03
const F_TRAILING_COMMA   = 0.88
const F_REPEATED_PUNCT   = 0.85
const F_GOOD_LENGTH      = 1.04
const F_TOO_LONG         = 0.92
const F_LEADING_SPACE    = 0.90

// ── Threshold constants ─────────────────────────────────────────
const TH_CHAR_DIVERSITY_LOW  = 0.6
const TH_CHAR_DIVERSITY_HIGH = 0.95
const TH_LEN_GOOD_MIN        = 5
const TH_LEN_GOOD_MAX        = 120
const TH_LEN_SUSPICIOUS      = 200

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
      const factor = F_MIXED_SCRIPTS
      quality *= factor
      signals.push(PENALTY(factor, 'mixed scripts detected'))
    }

    // 文本过短惩罚
    if (len > 0 && len <= 2) {
      const factor = F_TEXT_TOO_SHORT
      quality *= factor
      signals.push(PENALTY(factor, 'text too short (<3 chars)'))
    }

    // 重复字符惩罚
    if (/(.)\1{3,}/.test(text)) {
      const factor = F_REPEATED_CHAR
      quality *= factor
      signals.push(PENALTY(factor, 'repeated character pattern'))
    }

    // 字符多样性奖励（正常文本 unique ratio 在 0.6-0.95）
    const unique = new Set(text.replace(/\s/g, '')).size
    const ratio = len > 0 ? unique / len : 1
    if (ratio > TH_CHAR_DIVERSITY_LOW && ratio < TH_CHAR_DIVERSITY_HIGH) {
      const factor = F_CHAR_DIVERSITY
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
      // CJK Unified Ideographs (BMP): U+4E00–U+9FFF
      // CJK Unified Ideographs Extension B: U+20000–U+2A6DF
      // NOTE: plain `\u20000` in a regex is parsed as `\u2000` + literal `0` (NOT a valid range).
      // Use explicit code point array union to avoid this JS regex parsing trap.
      const cjkBMP = /[\u4e00-\u9fff]/
      const cjkExtB = /[\uD840-\uD869][\uDC00-\uDEDF]/
      const orphanedCJK = cjkBMP.test(text) && / [\u4e00-\u9fff]/.test(text) ||
                          cjkExtB.test(text) && / [\uD840-\uD869][\uDC00-\uDEDF]/.test(text)
      if (orphanedCJK) {
        const factor = F_ORPHANED_CJK
        quality *= factor
        signals.push(PENALTY(factor, 'orphaned CJK character'))
      }

      // 引号不平衡（单双引号各自计数）
      const dq = (text.match(/"/g) || []).length
      const sq = (text.match(/'/g) || []).length
      if (dq % 2 !== 0 || sq % 2 !== 0) {
        const factor = F_UNBALANCED_QUOTE
        quality *= factor
        signals.push(PENALTY(factor, 'unbalanced quotation marks'))
      }
    } else {
      // All-caps penalty: text is uppercase and contains at least one lowercase letter
      // (catches OCR errors where mixed-case was read as all-caps)
      // trim() normalizes, so check on trimmed: 'HELLo' is mixed case not all-caps
      const upperOnly = trimmed.replace(/[^A-Z]/g, '')
      if (upperOnly.length >= 4 && /[a-z]/.test(trimmed)) {
        const factor = F_ALL_CAPS
        quality *= factor
        signals.push(PENALTY(factor, 'all-caps (likely OCR error)'))
      }

      // 孤立数字片段
      if (/ \d{1,3} /.test(text)) {
        const factor = F_ISOLATED_DIGIT
        quality *= factor
        signals.push(PENALTY(factor, 'isolated digit fragment'))
      }

      // 正确句子结尾奖励
      if (/[.!?]$/.test(trimmed)) {
        const factor = F_SENTENCE_END
        quality = Math.min(1, quality * factor)
        signals.push(BONUS(factor, 'proper sentence ending'))
      }

      // 尾随逗号（不完整句子）
      if (/[,;]\s*$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
        const factor = F_TRAILING_COMMA
        quality *= factor
        signals.push(PENALTY(factor, 'trailing comma (incomplete sentence)'))
      }
    }

    // ── 通用规则 ──────────────────────────────────────────
    // 重复标点惩罚
    if (/[、,\.。\-_]{3,}$/.test(text)) {
      const factor = F_REPEATED_PUNCT
      quality *= factor
      signals.push(PENALTY(factor, 'repeated trailing punctuation'))
    }

    // 长度合理奖励
    if (len >= TH_LEN_GOOD_MIN && len <= TH_LEN_GOOD_MAX) {
      const factor = F_GOOD_LENGTH
      quality = Math.min(1, quality * factor)
      signals.push(BONUS(factor, 'reasonable subtitle length'))
    }
    if (len > TH_LEN_SUSPICIOUS) {
      const factor = F_TOO_LONG
      quality *= factor
      signals.push(PENALTY(factor, 'suspiciously long subtitle'))
    }

    // 开头空格/标点惩罚
    if (/^[\s,.!?;:]/.test(trimmed)) {
      const factor = F_LEADING_SPACE
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
