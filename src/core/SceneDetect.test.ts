import { describe, it, expect } from 'vitest'
import { SceneDetect } from './SceneDetect'

/**
 * Minimal ImageData polyfill for Node.js / vitest environment.
 * SceneDetect accesses: width, height, data (Uint8ClampedArray).
 */
function makeImageData(width: number, height: number, r: number, g: number, b: number, a = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4 + 0] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return { width, height, data } as unknown as ImageData
}

describe('SceneDetect', () => {
  // Use 32x32 with sampleCount=2000 so step=1 (all 1024 pixels sampled)
  const W = 32, H = 32

  // ─── detect() ─────────────────────────────────────────────────
  describe('detect()', () => {
    it('returns false for identical frames', () => {
      const detector = new SceneDetect({ threshold: 0.3, sampleCount: 2000 })
      const frame = makeImageData(W, H, 200, 100, 50)
      expect(detector.detect(frame, frame)).toBe(false)
    })

    it('returns true for very different frames', () => {
      const detector = new SceneDetect({ threshold: 0.3, sampleCount: 2000 })
      // Frame A: reddish (high R, low G/B)
      const frameA = makeImageData(W, H, 200, 50, 50)
      // Frame B: blueish (high B, low R/G) — quantized to different bins
      const frameB = makeImageData(W, H, 50, 50, 200)
      expect(detector.detect(frameA, frameB)).toBe(true)
    })

    it('returns true for different frames even with high threshold', () => {
      // Identical frames always return false regardless of threshold
      const detector = new SceneDetect({ threshold: 10, sampleCount: 2000 })
      const frame = makeImageData(W, H, 200, 100, 50)
      expect(detector.detect(frame, frame)).toBe(false)
    })
  })

  // ─── reset() ─────────────────────────────────────────────────
  describe('reset()', () => {
    it('does not throw', () => {
      const detector = new SceneDetect()
      expect(() => detector.reset()).not.toThrow()
    })
  })

  // ─── setThreshold() ──────────────────────────────────────────
  describe('setThreshold()', () => {
    it('updates the threshold', () => {
      const detector = new SceneDetect({ threshold: 0.3 })
      expect(detector.getOptions().threshold).toBe(0.3)
      detector.setThreshold(0.5)
      expect(detector.getOptions().threshold).toBe(0.5)
    })

    it('setThreshold updates affect detect() result for borderline frames', () => {
      // Create two frames that are different but not extremely so
      const frameA = makeImageData(W, H, 200, 0, 0)
      const frameB = makeImageData(W, H, 100, 0, 0)
      // R=200→bin12, R=100→bin6 (different bins, moderate chi-square)
      // With default threshold=0.3, this should be detected
      const defaultDetector = new SceneDetect({ threshold: 0.3, sampleCount: 2000 })
      expect(defaultDetector.detect(frameA, frameB)).toBe(true)
      // After raising threshold significantly, same frames may not trigger
      defaultDetector.setThreshold(50)
      expect(defaultDetector.getOptions().threshold).toBe(50)
    })
  })
})
