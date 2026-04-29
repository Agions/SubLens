import { describe, it, expect, beforeEach } from 'vitest'
import { ConfidenceCalibrator } from './ConfidenceCalibrator'

describe('ConfidenceCalibrator', () => {
  let calibrator: ConfidenceCalibrator

  beforeEach(() => {
    calibrator = new ConfidenceCalibrator()
  })

  // ─── calibrateEnhanced() ───────────────────────────────────────
  describe('calibrateEnhanced()', () => {
    it('returns raw confidence unchanged when text is empty', () => {
      const result = calibrator.calibrateEnhanced('', 0.85)
      expect(result.confidence).toBe(0.85)
      expect(result.signals).toHaveLength(0)
    })

    it('applies penalty for mixed scripts (chinese + latin)', () => {
      const result = calibrator.calibrateEnhanced('Hello世界', 1.0, 'chinese')
      const mixedPenalty = result.signals.find(s => s.reason === 'mixed scripts detected')
      expect(mixedPenalty).toBeDefined()
      expect(mixedPenalty!.type).toBe('penalty')
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('applies penalty for orphaned CJK character (space before CJK)', () => {
      const result = calibrator.calibrateEnhanced('Hello 中', 1.0, 'chinese')
      const signal = result.signals.find(s => s.reason === 'orphaned CJK character')
      expect(signal).toBeDefined()
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('applies penalty for unbalanced double quotes (chinese lang)', () => {
      const result = calibrator.calibrateEnhanced('"Hello', 1.0, 'chinese')
      const signal = result.signals.find(s => s.reason === 'unbalanced quotation marks')
      expect(signal).toBeDefined()
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('applies bonus for proper sentence ending (latin lang)', () => {
      const result = calibrator.calibrateEnhanced('Hello world.', 1.0, 'latin')
      const signal = result.signals.find(s => s.reason === 'proper sentence ending')
      expect(signal).toBeDefined()
      expect(signal!.type).toBe('bonus')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('applies penalty for trailing comma (incomplete sentence)', () => {
      const result = calibrator.calibrateEnhanced('Hello world,', 1.0, 'latin')
      const signal = result.signals.find(s => s.reason === 'trailing comma (incomplete sentence)')
      expect(signal).toBeDefined()
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('applies penalty for repeated trailing punctuation', () => {
      const result = calibrator.calibrateEnhanced('Hello...', 1.0, 'latin')
      const signal = result.signals.find(s => s.reason === 'repeated trailing punctuation')
      expect(signal).toBeDefined()
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('applies bonus for reasonable subtitle length (5-120 chars)', () => {
      const result = calibrator.calibrateEnhanced('This is a reasonable length sentence.', 0.9, 'latin')
      const signal = result.signals.find(s => s.reason === 'reasonable subtitle length')
      expect(signal).toBeDefined()
      expect(signal!.type).toBe('bonus')
    })

    it('applies penalty for suspiciously long subtitle (>200 chars)', () => {
      const longText = 'a'.repeat(201)
      const result = calibrator.calibrateEnhanced(longText, 1.0, 'latin')
      const signal = result.signals.find(s => s.reason === 'suspiciously long subtitle')
      expect(signal).toBeDefined()
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('applies penalty for leading punctuation after trim', () => {
      const result = calibrator.calibrateEnhanced('.Hello', 1.0, 'latin')
      const signal = result.signals.find(s => s.reason === 'leading whitespace or punctuation')
      expect(signal).toBeDefined()
      expect(result.confidence).toBeLessThan(1.0)
    })

    it('clamps confidence to [0, 1] range', () => {
      // Chain many bonuses — result should still be clamped to 1.0
      const result = calibrator.calibrateEnhanced('Hi.', 1.0, 'en')
      expect(result.confidence).toBeLessThanOrEqual(1.0)
      expect(result.confidence).toBeGreaterThanOrEqual(0.0)
    })
  })

  // ─── detectIssues() ─────────────────────────────────────────────
  describe('detectIssues()', () => {
    it('returns empty array for clean text', () => {
      const issues = calibrator.detectIssues('Hello world.')
      expect(issues).toHaveLength(0)
    })

    it('detects full-width characters', () => {
      // U+FF00 is FULLWIDTH SPACE, within the range \uff00-\uffef
      const issues = calibrator.detectIssues('Hello\uFF00World')
      expect(issues.some(i => i.issue.includes('full-width'))).toBe(true)
    })

    it('detects unbalanced brackets', () => {
      const issues = calibrator.detectIssues('Hello (World')
      expect(issues.some(i => i.issue.includes('Unbalanced brackets'))).toBe(true)
    })

    it('detects text ending with comma', () => {
      const issues = calibrator.detectIssues('Hello,')
      expect(issues.some(i => i.issue.includes('ends with comma'))).toBe(true)
    })

    it('detects repeated character pattern (5+ repeats)', () => {
      const issues = calibrator.detectIssues('Hellooooooo world')
      expect(issues.some(i => i.issue.includes('repeated character'))).toBe(true)
    })

    it('returns empty for empty string', () => {
      const issues = calibrator.detectIssues('')
      expect(issues).toHaveLength(0)
    })

    it('returns empty for whitespace-only string', () => {
      const issues = calibrator.detectIssues('   ')
      expect(issues).toHaveLength(0)
    })
  })
})
