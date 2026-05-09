/**
 * SceneDetect — 场景变化检测
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

export interface SceneDetectOptions {
  /** chi-square 阈值，默认 0.3 */
  threshold: number
  /** 每帧采样的像素数，默认 500 */
  sampleCount: number
  /** 直方图 bins 数量，默认 16 */
  binCount: number
}

export const DEFAULT_SCENE_DETECTOR_OPTIONS: SceneDetectOptions = {
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
  binCount: number,
  sampleCount: number
): number {
  const totalBins = binCount * 3
  let chiSquare = 0

  for (let b = 0; b < totalBins; b++) {
    // Skip bins where both histograms agree on zero (no information content)
    if (histA[b] === 0 && histB[b] === 0) continue
    // For all other bins: (observed - expected)^2 / expected
    // where expected = histA[b] (previous frame as reference)
    // Add-one smoothing to handle zero expected counts
    const expected = histA[b] || 1
    const observed = histB[b]
    chiSquare += ((observed - expected) ** 2) / expected
  }

  // Normalize by sampleCount * threshold so distance is proportional
  // to the average per-pixel contribution — threshold is stable across resolutions.
  return chiSquare / (sampleCount * threshold)
}

export class SceneDetect {
  private opts: Required<SceneDetectOptions>

  constructor(opts: Partial<SceneDetectOptions> = {}) {
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

    const distance = chiSquareDistance(prevHist, currHist, threshold, binCount, sampleCount)
    return distance > threshold
  }

  /**
   * 构建量化 RGB 直方图。
   * 采样策略：随机采样（ Mersenne Twister-seeded ），确保覆盖全帧、
   * 对小区域变化更敏感，避免步进采样规律性漏检。
   */
  private buildHistogram(
    frame: ImageData,
    binCount: number,
    sampleCount: number
  ): Int32Array {
    const hist = new Int32Array(binCount * 3)  // R, G, B 三个通道
    const { data } = frame
    const pixelCount = Math.floor(data.length / 4)

    // Seeded LCG 随机数生成器 — 确定性、可重现。
    // LCG 参数来自 Numerical Recipes 的 minimal version.
    let seed = 0xdeadbeef ^ pixelCount
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      // 归一化到 [0, 1)
      return (seed >>> 0) / 0x100000000
    }

    // 预分配采样索引数组（避免每轮 Math.random 开销量）
    // 采样放回（允许重复像素），因为 chi-square 对 hist[bin]=0 有容错处理
    for (let s = 0; s < sampleCount; s++) {
      const p = Math.floor(rand() * pixelCount)
      const i = p * 4

      // 跳过全透明像素
      if (data[i + 3] < 128) continue

      hist[quantize(data[i],     binCount)]++
      hist[binCount + quantize(data[i + 1], binCount)]++
      hist[binCount * 2 + quantize(data[i + 2], binCount)]++
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
  getOptions(): SceneDetectOptions {
    return { ...this.opts }
  }
}
