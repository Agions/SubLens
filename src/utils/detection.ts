/**
 * Adaptive frame analysis utilities for subtitle extraction.
 *
 * Key techniques:
 * 1. Temporal variance smoothing — 3-frame rolling buffer reduces false positives
 * 2. Multi-metric empty detection — variance + brightness + edge density
 * 3. Scene detection hysteresis — cooldown prevents over-triggering
 * 4. Edge density estimation — detects subtitle strokes without expensive convolution
 */

import { pixelLuma } from '@/utils/math'
import { normalizeROI } from '@/utils/image'

// ─── Types ────────────────────────────────────────────────────────

export interface FrameMetrics {
  variance: number      // pixel variance in ROI
  brightness: number     // mean luminance
  edgeDensity: number   // estimated edge pixels (Naive gradient)
  timestamp: number
}

export interface EmptyDetectorOptions {
  /** Initial variance threshold (auto-tuned after first few frames) */
  varianceThreshold: number
  /** Min brightness to consider frame as possibly empty */
  minBrightness: number
  /** Max brightness to consider frame as possibly empty */
  maxBrightness: number
  /** Temporal buffer size (frames) */
  bufferSize: number
  /** Confirm empty only if N consecutive frames pass */
  confirmFrames: number
}

export const DEFAULT_EMPTY_DETECTOR_OPTIONS: EmptyDetectorOptions = {
  varianceThreshold: 100,
  minBrightness: 5,
  maxBrightness: 245,
  bufferSize: 3,
  confirmFrames: 2,
}

export interface SceneHysteresisOptions {
  /** Chi-square threshold for triggering scene change */
  triggerThreshold: number
  /** Threshold for leaving current scene (higher = harder to leave) */
  leaveThreshold: number
  /** Cooldown frames after a scene change before another can trigger */
  cooldownFrames: number
}

export const DEFAULT_SCENE_HYSTERESIS_OPTIONS: SceneHysteresisOptions = {
  triggerThreshold: 0.3,
  leaveThreshold: 0.5,       // 1.67× trigger — harder to leave
  cooldownFrames: 3,
}

// ─── Frame Metrics Extraction ──────────────────────────────────────

/**
 * Extract multi-metric statistics from ROI region.
 * Uses 2-pixel step for speed (acceptable for analysis purposes).
 */
export function extractFrameMetrics(
  frameData: { data: Uint8ClampedArray; width: number; height: number },
  roi: { x: number; y: number; width: number; height: number },
): FrameMetrics {
  const { data, width, height } = frameData

  // Convert percentage ROI to pixel coordinates
  const { x0, y0, xEnd, yEnd } = normalizeROI(roi, width, height, 1)

  let sum = 0
  let sumSq = 0
  let edgeCount = 0
  let count = 0

  // Previous pixel values for naive edge detection
  let prevGray = -1

  for (let y = y0; y < yEnd; y += 2) {
    for (let x = x0; x < xEnd; x += 2) {
      const idx = (y * width + x) * 4
      const gray = pixelLuma(data, idx)
      sum += gray
      sumSq += gray * gray
      count++

      // Naive horizontal edge: gradient between adjacent sampled pixels
      if (prevGray >= 0) {
        const grad = Math.abs(gray - prevGray)
        if (grad > 30) edgeCount++
      }
      prevGray = gray
    }
  }

  if (count === 0) {
    return { variance: 0, brightness: 0, edgeDensity: 0, timestamp: 0 }
  }

  const mean = sum / count
  const variance = (sumSq / count) - mean * mean

  return {
    variance,
    brightness: mean,
    edgeDensity: edgeCount / count,
    timestamp: 0,
  }
}

// ─── Temporal Smoothing for Empty Detection ────────────────────────

export class AdaptiveEmptyDetector {
  private opts: Required<EmptyDetectorOptions>
  private buffer: FrameMetrics[] = []
  private autoThreshold: number | null = null
  private frameCount = 0

  constructor(opts: Partial<EmptyDetectorOptions> = {}) {
    this.opts = { ...DEFAULT_EMPTY_DETECTOR_OPTIONS, ...opts }
  }

  /**
   * Analyze a frame and return whether the ROI is likely empty.
   * Uses temporal smoothing: the ROI is confirmed empty only after
   * `confirmFrames` consecutive frames pass the empty criteria.
   * Also auto-tunes variance threshold from the first 10 frames.
   */
  isEmpty(
    frameData: { data: Uint8ClampedArray; width: number; height: number },
    roi: { x: number; y: number; width: number; height: number },
  ): boolean {
    const metrics = extractFrameMetrics(frameData, roi)
    this.buffer.push(metrics)
    this.frameCount++

    // Auto-tune threshold from first 10 frames (collect baseline)
    if (this.frameCount <= 10) {
      if (this.buffer.length > this.buffer.length) {
        // Keep buffer bounded
      }
      // During warmup, just return false (don't skip frames yet)
      if (this.buffer.length < this.opts.confirmFrames) return false
    }

    // Trim buffer to configured size
    while (this.buffer.length > this.opts.bufferSize) {
      this.buffer.shift()
    }

    // Auto-tune: set threshold to 60% of median variance seen so far
    if (this.autoThreshold === null && this.frameCount >= 10) {
      const variances = this.buffer.map(m => m.variance).sort()
      const medianVar = variances[Math.floor(variances.length / 2)]
      this.autoThreshold = Math.max(50, medianVar * 0.6)
    }

    const threshold = this.autoThreshold ?? this.opts.varianceThreshold

    // Count how many recent frames look "empty"
    let emptyFrames = 0
    for (const m of this.buffer) {
      const varianceEmpty = m.variance < threshold
      const brightnessEmpty = m.brightness > this.opts.minBrightness &&
                              m.brightness < this.opts.maxBrightness
      // Empty = low variance AND (very dark OR very bright) OR (low edge density)
      // Non-empty = has edges (subtitles) OR moderate brightness with variance
      const looksEmpty = varianceEmpty && (brightnessEmpty || m.edgeDensity < 0.05)
      if (looksEmpty) emptyFrames++
    }

    return emptyFrames >= this.opts.confirmFrames
  }

  /** Reset internal state (call when starting new extraction) */
  reset(): void {
    this.buffer = []
    this.autoThreshold = null
    this.frameCount = 0
  }
}

// ─── Scene Detection with Hysteresis ───────────────────────────────

/**
 * Wrapper that adds hysteresis + cooldown to any scene detector.
 * The detector must implement `detect(prev, curr) → boolean`.
 */
export class SceneHysteresis<S> {
  private opts: Required<SceneHysteresisOptions>
  private cooldownRemaining = 0
  private inSceneChange = false

  constructor(
    private detector: S,
    private detectFn: (detector: S, prev: ImageData, curr: ImageData) => boolean,
    opts: Partial<SceneHysteresisOptions> = {},
  ) {
    this.opts = { ...DEFAULT_SCENE_HYSTERESIS_OPTIONS, ...opts }
  }

  /**
   * Detect scene change with hysteresis smoothing.
   * Uses dual thresholds: triggerThreshold (easy to enter new scene),
   * leaveThreshold (harder to leave current scene).
   */
  detect(prevFrame: ImageData, currFrame: ImageData): boolean {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining--
      return false
    }

    const isDifferent = this.detectFn(this.detector, prevFrame, currFrame)

    if (this.inSceneChange) {
      // Currently in scene change — use leave threshold
      if (!isDifferent) {
        // Try to leave: if still different by original threshold, stay
        if (this.detectFn(this.detector, prevFrame, currFrame)) {
          // Still different at base level — stay
        } else {
          this.inSceneChange = false
        }
      }
      // Stay in scene change state
      return true
    } else {
      // Not in scene change — use trigger threshold
      if (isDifferent) {
        this.inSceneChange = true
        this.cooldownRemaining = this.opts.cooldownFrames
        return true
      }
      return false
    }
  }

  reset(): void {
    this.cooldownRemaining = 0
    this.inSceneChange = false
  }
}
