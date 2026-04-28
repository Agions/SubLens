import { describe, it, expect } from 'vitest'
import { _mergeOCRResults as mergeOCRResults } from './useOCREngine'

// ─── OCRResult factory ───────────────────────────────────────────────────────
function makeResult(
  text: string,
  confidence: number,
  x: number,
  y: number,
  w = 10,
  h = 10,
) {
  return {
    text,
    confidence,
    boundingBox: { x, y, width: w, height: h },
  }
}

describe('mergeOCRResults', () => {
  // ─── Empty / single ────────────────────────────────────────────────────────
  it('returns empty array for empty input', () => {
    expect(mergeOCRResults([])).toEqual([])
  })

  it('returns empty array when all batches are empty', () => {
    expect(mergeOCRResults([[], []])).toEqual([])
  })

  it('returns single result as-is', () => {
    const r = [makeResult('hello', 0.95, 0, 0)]
    expect(mergeOCRResults([r])).toEqual(r)
  })

  // ─── Spatial deduplication ─────────────────────────────────────────────────
  it('keeps results in different spatial cells', () => {
    // cell size = 20; (0,0)→cell(0,0), (100,100)→cell(5,5)
    const r1 = makeResult('hello', 0.9, 0, 0)
    const r2 = makeResult('world', 0.8, 100, 100)
    const result = mergeOCRResults([[r1, r2]])
    expect(result).toHaveLength(2)
  })

  it('same cell different text: later entry overwrites (Map key collision)', () => {
    // (5,5)→center(10,10)→cell(0,0) and (10,10)→center(15,15)→cell(0,0) — same cell
    const r1 = makeResult('hello', 0.9, 5, 5)
    const r2 = makeResult('world', 0.8, 10, 10)
    const result = mergeOCRResults([[r1, r2]])
    // Same cell key → later (higher-conf sorted) entry overwrites → 1 result
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('world')
  })

  it('different text in adjacent cells: both kept', () => {
    // r1 at cell (0,0), r2 at cell (1,1) — different cells, different text
    const r1 = makeResult('hello', 0.9, 5, 5)
    const r2 = makeResult('world', 0.85, 15, 15)
    const result = mergeOCRResults([[r1, r2]])
    expect(result).toHaveLength(2)
    const texts = result.map(r => r.text).sort()
    expect(texts).toEqual(['hello', 'world'])
  })

  it('deduplicates results with identical text in same cell neighbor', () => {
    const r1 = makeResult('hello', 0.9, 5, 5)
    const r2 = makeResult('hello', 0.7, 15, 15)  // same cell (0,0), same text
    const result = mergeOCRResults([[r1, r2]])
    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe(0.9)
  })

  it('deduplicates using 3x3 neighbor check', () => {
    const r1 = makeResult('hello', 0.95, 5, 5)    // cell (0,0)
    const r2 = makeResult('hello', 0.8, 20, 20)  // cell (1,1) — adjacent, same text
    const result = mergeOCRResults([[r1, r2]])
    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe(0.95)
  })

  it('keeps results with same text in distant non-adjacent cells', () => {
    const r1 = makeResult('hello', 0.9, 5, 5)       // cell (0,0)
    const r2 = makeResult('hello', 0.8, 100, 100)   // cell (5,5) — not adjacent
    const result = mergeOCRResults([[r1, r2]])
    expect(result).toHaveLength(2)
  })

  // ─── Confidence ordering ───────────────────────────────────────────────────
  it('higher confidence result wins when deduplicated', () => {
    const r1 = makeResult('test', 0.5, 5, 5)
    const r2 = makeResult('test', 0.9, 15, 15)
    const r3 = makeResult('test', 0.7, 25, 25)
    const result = mergeOCRResults([[r1, r2, r3]])
    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe(0.9)
  })

  it('different text in same cell: later overwrites (Map key collision)', () => {
    // Both centers in cell (0,0): (5,5)→c(10,10) and (8,8)→c(13,13)
    const r1 = makeResult('hello', 0.9, 5, 5)
    const r2 = makeResult('world', 0.85, 8, 8)  // same cell (0,0)
    const result = mergeOCRResults([[r1, r2]])
    // Same cell key → later (sorted by conf) overwrites → only 'world' kept
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('world')
  })

  // ─── Multi-batch flattening ────────────────────────────────────────────────
  it('flattens multiple batches before deduplication', () => {
    const batch1 = [makeResult('a', 0.9, 5, 5), makeResult('b', 0.8, 30, 5)]
    const batch2 = [makeResult('a', 0.7, 10, 10), makeResult('c', 0.6, 50, 5)]
    const result = mergeOCRResults([batch1, batch2])
    // 'a' appears twice → highest conf (0.9) wins
    // 'b' and 'c' are unique → kept
    expect(result).toHaveLength(3)
    const texts = result.map(r => r.text).sort()
    expect(texts).toEqual(['a', 'b', 'c'])
    expect(result.find(r => r.text === 'a')!.confidence).toBe(0.9)
  })

  // ─── Edge cases ────────────────────────────────────────────────────────────
  it('handles result at cell boundary (x=20, y=20)', () => {
    const r1 = makeResult('text', 0.9, 20, 20)  // cell (1,1) exactly
    const r2 = makeResult('text', 0.8, 39, 39)  // cell (1,1) — last pixel of same cell
    const result = mergeOCRResults([[r1, r2]])
    expect(result).toHaveLength(1)
  })

  it('returns results sorted by confidence descending', () => {
    const r1 = makeResult('low', 0.3, 5, 5)
    const r2 = makeResult('high', 0.95, 100, 100)
    const r3 = makeResult('mid', 0.7, 200, 200)
    const result = mergeOCRResults([[r1, r2, r3]])
    expect(result[0].text).toBe('high')
    expect(result[1].text).toBe('mid')
    expect(result[2].text).toBe('low')
  })
})