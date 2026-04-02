/**
 * CLI OCR Post-processing Pipeline
 * Ported from Vue composable useOCREngine.ts
 */

// ── Text Post-Processing ─────────────────────────────────────────────────────

const FULLWIDTH_MAP: Array<[string, string]> = [
  ['\u3001', ','], ['\u3002', '.'], ['\uff01', '!'], ['\uff1f', '?'],
  ['\uff1a', ':'], ['\uff1b', ';'], ['\u201c', '"'], ['\u201d', '"'],
  ['\u2018', "'"], ['\u2019', "'"], ['\uff08', '('], ['\uff09', ')'],
  ['\u3010', '['], ['\u3011', ']'], ['\u2014', '-'], ['\u2026', '...'],
  ['\uff0e', '.'], ['\uff0c', ','],
]

/**
 * Normalize OCR text: trim, collapse whitespace, fix punctuation, remove repeated chars.
 */
export function postProcessText(text: string, lang: string = 'ch'): string {
  if (!text || !text.trim()) return text
  let result = text.trim()
  result = result.replace(/\s+/g, ' ')

  for (const [fw, hw] of FULLWIDTH_MAP) {
    result = result.split(fw).join(hw)
  }

  // Remove 3+ consecutive repeated characters → keep max 2
  result = result.replace(/(.)\1{2,}/g, '$1$1')

  // Chinese-specific common OCR confusions
  const chineseFixes: Record<string, string> = {
    '兀': '元', '苒': '再', '巳': '已', '汢': '汪',
  }
  for (const [wrong, right] of Object.entries(chineseFixes)) {
    result = result.split(wrong).join(right)
  }

  // Non-Chinese: lowercase after sentence punctuation
  if (lang !== 'ch' && lang !== 'chi') {
    result = result.replace(/(?:^|[.!?]\s+)([A-Z])/g, (_, c) =>
      _.replace(c, c.toLowerCase())
    )
  }

  return result
}

// ── Confidence Calibration ─────────────────────────────────────────────────────

/**
 * Calibrate confidence based on text quality signals.
 */
export function calibrateConfidence(
  text: string,
  rawConfidence: number,
  lang: string = 'ch'
): number {
  if (!text) return rawConfidence

  const len = text.replace(/\s/g, '').length
  const hasChinese = /[\u4e00-\u9fff]/.test(text)
  const hasLatin = /[a-zA-Z]/.test(text)
  const hasDigit = /\d/.test(text)
  const scriptCount = [hasChinese, hasLatin, hasDigit].filter(Boolean).length

  let quality = rawConfidence
  if (scriptCount >= 2) quality *= 0.80       // Mixed scripts penalize
  if (len > 0 && len <= 2) quality *= 0.85     // Very short text penalize
  if (len > 0 && /(.)\1{3,}/.test(text)) quality *= 0.75  // Repeated char penalty

  const unique = new Set(text.replace(/\s/g, '')).size
  const ratio = len > 0 ? unique / len : 1
  if (ratio > 0.6 && ratio < 0.95) quality = Math.min(1, quality * 1.05)

  return Math.max(0, Math.min(1, quality))
}

// ── Text Similarity (Levenshtein) ─────────────────────────────────────────────

export function textSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0

  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  const dist = dp[b.length]
  return 1 - dist / Math.max(a.length, b.length)
}

// ── Subtitle Merging ─────────────────────────────────────────────────────────

export interface RawSubtitle {
  startTime: number
  endTime: number
  text: string
  confidence: number
}

export interface MergedSubtitle extends RawSubtitle {
  startFrame: number
  endFrame: number
}

/**
 * Merge consecutive subtitles that are similar (Levenshtein similarity >= threshold)
 * and time gap <= maxGap seconds.
 */
export function mergeSimilarSubtitles(
  subtitles: RawSubtitle[],
  fps: number,
  similarityThreshold: number = 0.80,
  maxGap: number = 0.5
): MergedSubtitle[] {
  if (subtitles.length === 0) return []

  const result: MergedSubtitle[] = []
  let current: MergedSubtitle = {
    ...subtitles[0],
    startFrame: Math.round(subtitles[0].startTime * fps),
    endFrame: Math.round(subtitles[0].endTime * fps),
  }

  for (let i = 1; i < subtitles.length; i++) {
    const prev = subtitles[i - 1]
    const curr = subtitles[i]
    const gap = curr.startTime - prev.endTime
    const similarity = textSimilarity(current.text, curr.text)

    if (similarity >= similarityThreshold && gap <= maxGap) {
      // Merge: extend end, keep highest confidence
      current.endTime = Math.max(current.endTime, curr.endTime)
      current.endFrame = Math.max(current.endFrame, Math.round(curr.endTime * fps))
      current.confidence = Math.max(current.confidence, curr.confidence)
    } else {
      result.push(current)
      current = {
        ...curr,
        startFrame: Math.round(curr.startTime * fps),
        endFrame: Math.round(curr.endTime * fps),
      }
    }
  }
  result.push(current)

  return result
}
