/**
 * Calibrator — 置信度校准引擎
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

// ─── 规则引擎 ──────────────────────────────────────────────────────
// 所有校准规则的结构完全相同（condition → factor → quality 更新 + signal push）。
// 统一为规则数组 + 驱动循环，消除 20+ 处重复的 if/factor/push 模式。

type Rule = {
  condition: boolean
  factor: number
  reason: string
  bonus?: boolean   // true = bonus (Math.min cap), false/undefined = penalty
}

function _applyRules(rules: Rule[], signals: CalibrationSignal[], quality: number): number {
  for (const { condition, factor, reason, bonus } of rules) {
    if (!condition) continue
    signals.push(bonus ? BONUS(factor, reason) : PENALTY(factor, reason))
    quality = bonus ? Math.min(1, quality * factor) : quality * factor
  }
  return quality
}

export class Calibrator {
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

    const quality = _applyRules([
      { condition: scriptCount >= 2,                        factor: F_MIXED_SCRIPTS,   reason: 'mixed scripts detected' },
      { condition: len > 0 && len <= 2,                     factor: F_TEXT_TOO_SHORT,  reason: 'text too short (<3 chars)' },
      { condition: /(.)\1{3,}/.test(text),                  factor: F_REPEATED_CHAR,   reason: 'repeated character pattern' },
      { condition: (() => {
          const unique = new Set(text.replace(/\s/g, '')).size
          const ratio = len > 0 ? unique / len : 1
          return ratio > TH_CHAR_DIVERSITY_LOW && ratio < TH_CHAR_DIVERSITY_HIGH
        })(),                                                 factor: F_CHAR_DIVERSITY,  reason: 'healthy character diversity', bonus: true },
    ], signals, raw)

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

    // ── 规则引擎驱动（各分支条件预计算）──────────────
    // CJK vs non-CJK 预计算条件
    const isCJK = script === 'chinese' || script === 'japanese' || script === 'korean'
    const cjkBMP = /[\u4e00-\u9fff]/
    const cjkExtB = /[\uD840-\uD869][\uDC00-\uDEDF]/
    const orphanedCJK = isCJK && (
      (cjkBMP.test(text) && / [\u4e00-\u9fff]/.test(text)) ||
      (cjkExtB.test(text) && / [\uD840-\uD869][\uDC00-\uDEDF]/.test(text))
    )
    const dq = (text.match(/"/g) || []).length
    const sq = (text.match(/'/g) || []).length
    const upperOnly = trimmed.replace(/[^A-Z]/g, '')

    // CJK 规则组 / non-CJK 规则组（互斥，按分支选取）
    const scriptRules = isCJK ? [
      { condition: orphanedCJK,                                factor: F_ORPHANED_CJK,      reason: 'orphaned CJK character' },
      { condition: dq % 2 !== 0 || sq % 2 !== 0,             factor: F_UNBALANCED_QUOTE,  reason: 'unbalanced quotation marks' },
    ] : [
      { condition: upperOnly.length >= 4 && /[a-z]/.test(trimmed), factor: F_ALL_CAPS,    reason: 'all-caps (likely OCR error)' },
      { condition: / \d{1,3} /.test(text),                                             factor: F_ISOLATED_DIGIT,  reason: 'isolated digit fragment' },
      { condition: /[.!?]$/.test(trimmed),                                             factor: F_SENTENCE_END,    reason: 'proper sentence ending', bonus: true },
      { condition: /[,;]\s*$/.test(trimmed) && !/[.!?]$/.test(trimmed),               factor: F_TRAILING_COMMA,  reason: 'trailing comma (incomplete sentence)' },
    ]

    // 通用规则组
    const commonRules = [
      { condition: /[、,\\.。\-_]{3,}$/.test(text),           factor: F_REPEATED_PUNCT, reason: 'repeated trailing punctuation' },
      { condition: len >= TH_LEN_GOOD_MIN && len <= TH_LEN_GOOD_MAX, factor: F_GOOD_LENGTH, reason: 'reasonable subtitle length', bonus: true },
      { condition: len > TH_LEN_SUSPICIOUS,                  factor: F_TOO_LONG,      reason: 'suspiciously long subtitle' },
      { condition: /^[\s,.!?;:]/.test(trimmed),              factor: F_LEADING_SPACE,  reason: 'leading whitespace or punctuation' },
    ]

    quality = _applyRules([...scriptRules, ...commonRules], signals, quality)
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
let _calibrator: Calibrator | null = null

export function getCalibrator(): Calibrator {
  if (!_calibrator) _calibrator = new Calibrator()
  return _calibrator
}
