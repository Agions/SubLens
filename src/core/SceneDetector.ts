/**
 * SceneDetector — 场景变化检测
 * =================================
 * 基于量化直方图 + chi-square 比较的场景变化检测。
 *
 * 算法原理：
 * - 将 RGB 通道各自量化到 16 个 bins（4bit 精度）
 * - 对前后两帧计算 chi-square 距离
 * - chi-square > threshold → 场景变化
 *
 * 优势：
 * - O(n) 时间复杂度（n = 采样像素数）
 * - 内存占用极低（仅 48 个计数器）
 * - 对光照渐变鲁棒（量化平滑噪声）
 */

export interface SceneDetectorOptions {
  /** chi-square 阈值，默认 0.3 */
  threshold: number
  /** 每帧采样的像素数，默认 500 */
  sampleCount: number
  /** 直方图 bins 数量，默认 16 */
  binCount: number
}

export const DEFAULT_SCENE_DETECTOR_OPTIONS: SceneDetectorOptions = {
  threshold: 0.3,
  sampleCount: 500,
  binCount: 16,
}

/**
 * 量化 RGB 通道到固定数量的 bins。
 * 相比浮点比较，对 JPEG 压缩噪声更鲁棒。
 */
function quantize(value: number, binCount: number): number {
  return Math.floor((value / 256) * binCount)
}

/**
 * 计算两帧之间的 chi-square 距离。
 * 返回值越大表示差异越大。
 */
function chiSquareDistance(
  histA: Int32Array,
  histB: Int32Array,
  threshold: number,
  binCount: number
): number {
  const totalBins = binCount * 3
  let chiSquare = 0

  for (let b = 0; b < totalBins; b++) {
    const expected = histA[b] || 0.1  // 平滑：避免除零
    const observed = histB[b]
    chiSquare += ((observed - expected) ** 2) / expected
  }

  // 归一化：除以总 bins * threshold，得到 [0,1] 范围
  return chiSquare / (totalBins * threshold)
}

export class SceneDetector {
  private opts: Required<SceneDetectorOptions>

  constructor(opts: Partial<SceneDetectorOptions> = {}) {
    this.opts = { ...DEFAULT_SCENE_DETECTOR_OPTIONS, ...opts }
  }

  /**
   * 检测两帧之间是否有场景变化。
   * @param prevFrame 前一帧 ImageData
   * @param currFrame 当前帧 ImageData
   * @returns true = 场景变化，false = 同一场景
   */
  detect(prevFrame: ImageData, currFrame: ImageData): boolean {
    const { threshold, sampleCount, binCount } = this.opts
    const prevHist = this.buildHistogram(prevFrame, binCount, sampleCount)
    const currHist = this.buildHistogram(currFrame, binCount, sampleCount)

    const distance = chiSquareDistance(prevHist, currHist, threshold, binCount)
    return distance > threshold
  }

  /**
   * 构建量化 RGB 直方图。
   * 采样策略：均匀步进采样，确保覆盖全帧。
   */
  private buildHistogram(
    frame: ImageData,
    binCount: number,
    sampleCount: number
  ): Int32Array {
    const hist = new Int32Array(binCount * 3)  // R, G, B 三个通道
    const { data } = frame
    const pixelCount = Math.floor(data.length / 4)
    const step = Math.max(1, Math.floor(pixelCount / sampleCount))

    for (let p = 0; p < pixelCount; p += step) {
      const i = p * 4
      // 跳过全透明像素
      if (data[i + 3] < 128) continue

      hist[quantize(data[i], binCount)]++                        // R
      hist[binCount + quantize(data[i + 1], binCount)]++         // G
      hist[binCount * 2 + quantize(data[i + 2], binCount)]++     // B
    }

    return hist
  }

  /** 重置内部状态（切换视频时调用） */
  reset(): void {
    // 无状态需要清理（每帧独立计算直方图）
  }

  /** 更新检测阈值 */
  setThreshold(threshold: number): void {
    this.opts.threshold = threshold
  }

  /** 获取当前配置 */
  getOptions(): SceneDetectorOptions {
    return { ...this.opts }
  }
}
