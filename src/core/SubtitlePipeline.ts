/**
 * SubtitlePipeline — SubLens Core
 * ================================
 * 独立的后处理管道：将原始 OCR 结果经过多级处理得到干净字幕。
 *
 * 管道阶段（顺序执行）：
 *   Stage 0: normalize      — 文本正则化（CRLF 合并、全角/半角规范化）
 *   Stage 1: filterJitter   — 移除单帧 OCR 噪声
 *   Stage 2: mergeSplit      — 合并因场景检测跳跃而分裂的相同字幕
 *   Stage 3: mergeSimilar    — 合并时间接近的相似字幕
 *   Stage 4: computeEndTime  — 根据下一条字幕计算 endTime（准确时长）
 *
 * 设计原则：
 * - 每个阶段是纯函数，输入输出均为 SubtitleLite[]
 * - 阶段可独立配置（启用/禁用/调整参数）
 * - O(n log n) 复杂度（每阶段最多一次排序）
 * - 所有 Levenshtein 计算结果缓存（避免重复计算）
 */

import type { SubtitleLite } from '@/types/subtitle'

export interface PipelineOptions {
  /** 最小持续时间（秒），低于此值视为噪声 */
  jitterMinDuration: number
  /** 噪声字幕的最高置信度阈值 */
  jitterMaxConfidence: number
  /** 合并分裂字幕的最大时间间隙（秒） */
  splitMaxGap: number
  /** 分裂字幕的文本相似度阈值 [0-1] */
  splitSimilarityThreshold: number
  /** 合并相似字幕的时间接近阈值（秒） */
  similarMaxGap: number
  /** 合并相似字幕的文本相似度阈值 [0-1] */
  similarSimilarityThreshold: number
}

export const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  jitterMinDuration: 0.3,
  jitterMaxConfidence: 0.75,
  splitMaxGap: 1.5,
  splitSimilarityThreshold: 0.85,
  similarMaxGap: 0.5,
  similarSimilarityThreshold: 0.80,
}

// ─── Levenshtein 距离（带缓存）──────────────────────────────────────
// LRU cache using Map (insertion-order aware) — O(1) delete via Map.delete
const _similarityCache = new Map<string, number>()
const MAX_CACHE_SIZE = 3000
const TRIM_TO_SIZE = 2000

export function textSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0

  // 缓存键：取短串在前 + 长度前缀（避免长键）
  const short = a.length <= b.length ? a : b
  const long = a.length <= b.length ? b : a
  const cacheKey = `${short.length}:${short.slice(0, 4)}|${long.slice(0, 8)}:${a}|${b}`
  const cached = _similarityCache.get(cacheKey)
  if (cached !== undefined) return cached

  const dp: number[] = Array.from({ length: long.length + 1 }, (_, i) => i)
  for (let i = 1; i <= short.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= long.length; j++) {
      const temp = dp[j]
      dp[j] = short[i - 1] === long[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  const dist = dp[long.length]
  const sim = 1 - dist / Math.max(short.length, long.length)

  // LRU 缓存淘汰 — Map.delete 是 O(1)，避免 Array.shift() 的 O(n)
  if (_similarityCache.size >= MAX_CACHE_SIZE) {
    for (const key of _similarityCache.keys()) {
      if (_similarityCache.size <= TRIM_TO_SIZE) break
      _similarityCache.delete(key)
    }
  }
  _similarityCache.set(cacheKey, sim)
  return sim
}

// ─── Stage 0: 文本正则化（CRLF 合并 + 全角/半角规范化）───────────────
function stage0_normalize(subs: SubtitleLite[]): SubtitleLite[] {
  return subs.map(sub => ({
    ...sub,
    text: sub.text
      // 统一换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 移除每行首尾空白
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // 去除连续多个换行
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }))
}

// ─── Stage 1: 过滤 OCR 噪声 ───────────────────────────────────────
function stage1_filterJitter(subs: SubtitleLite[], opts: PipelineOptions): SubtitleLite[] {
  if (subs.length < 2) return subs

  const result: SubtitleLite[] = []
  let i = 0

  while (i < subs.length) {
    const curr = subs[i]
    const duration = curr.endTime - curr.startTime
    const isJitter =
      duration < opts.jitterMinDuration &&
      curr.confidence < opts.jitterMaxConfidence

    if (!isJitter) {
      result.push(curr)
      i++
      continue
    }

    const prev = result[result.length - 1]
    const next = subs[i + 1]

    const simPrev = prev ? textSimilarity(prev.text, curr.text) : 0
    const simNext = next ? textSimilarity(curr.text, next.text) : 0
    const similarThreshold = opts.splitSimilarityThreshold

    if (simPrev >= similarThreshold && simNext >= similarThreshold) {
      // 三连相同 → 桥接到前一条
      prev.endTime = next.endTime
      prev.endFrame = next.endFrame
      i += 2
    } else if (simPrev >= similarThreshold) {
      // 吸收入前一条
      prev.endTime = Math.max(prev.endTime, curr.endTime)
      prev.endFrame = Math.max(prev.endFrame, curr.endFrame)
      i++
    } else if (simNext >= similarThreshold) {
      // 吸收后一条
      curr.endTime = next.endTime
      curr.endFrame = next.endFrame
      result.push(curr)
      i += 2
    } else {
      result.push(curr)
      i++
    }
  }

  return result
}

// ─── Stage 2: 合并分裂字幕 ─────────────────────────────────────────
function stage2_mergeSplit(subs: SubtitleLite[], opts: PipelineOptions): SubtitleLite[] {
  if (subs.length < 2) return subs

  const groups: SubtitleLite[][] = []

  for (const sub of subs) {
    const last = groups[groups.length - 1]
    if (!last) {
      groups.push([{ ...sub }])
      continue
    }

    const prev = last[last.length - 1]
    const gap = sub.startTime - prev.endTime
    const sim = textSimilarity(prev.text, sub.text)
    const gapWithinLimit = gap > 0 && gap <= opts.splitMaxGap

    if (sim >= opts.splitSimilarityThreshold && gapWithinLimit) {
      last.push({ ...sub })
    } else {
      groups.push([{ ...sub }])
    }
  }

  return groups.flatMap(group => {
    if (group.length === 1) return group

    const best = group.reduce((b, c) => c.confidence > b.confidence ? c : b)
    return [{
      startTime: group[0].startTime,
      endTime: group[group.length - 1].endTime,
      startFrame: group[0].startFrame,
      endFrame: group[group.length - 1].endFrame,
      text: best.text,
      confidence: Math.max(...group.map(s => s.confidence)),
    }]
  })
}

// ─── Stage 3: 合并相似相邻字幕 ─────────────────────────────────────
function stage3_mergeSimilar(subs: SubtitleLite[], opts: PipelineOptions): SubtitleLite[] {
  if (subs.length === 0) return subs

  const result: SubtitleLite[] = []
  let current = { ...subs[0] }

  for (let i = 1; i < subs.length; i++) {
    const prev = subs[i - 1]
    const curr = subs[i]
    const gap = curr.startTime - prev.endTime
    const sim = textSimilarity(current.text, curr.text)

    if (sim >= opts.similarSimilarityThreshold && gap <= opts.similarMaxGap) {
      // 合并
      current.endTime = Math.max(current.endTime, curr.endTime)
      current.endFrame = Math.max(current.endFrame, curr.endFrame)
      current.confidence = Math.max(current.confidence, curr.confidence)
    } else {
      result.push(current)
      current = { ...curr }
    }
  }
  result.push(current)

  return result
}

// ─── Stage 4: 计算 endTime（基于下一条字幕）────────────────────────
function stage4_computeEndTime(subs: SubtitleLite[]): SubtitleLite[] {
  if (subs.length === 0) return subs

  return subs.map((sub, i) => {
    const next = subs[i + 1]
    return {
      ...sub,
      endTime: next ? Math.min(next.startTime, sub.startTime + 10) : sub.endTime,
    }
  })
}

// ─── 主管道 ─────────────────────────────────────────────────────
export class SubtitlePipeline {
  private opts: PipelineOptions

  constructor(opts: Partial<PipelineOptions> = {}) {
    this.opts = { ...DEFAULT_PIPELINE_OPTIONS, ...opts }
  }

  /**
   * 执行完整后处理管道。
   * 输入：原始 OCR 提取的字幕列表
   * 输出：清洗后的字幕列表
   */
  process(rawSubs: SubtitleLite[]): SubtitleLite[] {
    let result = [...rawSubs]

    // 按时间排序（addSubtitle 已保证有序，此处防御性排序）
    result.sort((a, b) => a.startTime - b.startTime)

    // Stage 0: 文本正则化
    result = stage0_normalize(result)

    // Stage 1: 过滤噪声
    result = stage1_filterJitter(result, this.opts)

    // Stage 2: 合并分裂字幕
    result = stage2_mergeSplit(result, this.opts)

    // Stage 3: 合并相似字幕
    result = stage3_mergeSimilar(result, this.opts)

    // Stage 4: 计算准确时长
    result = stage4_computeEndTime(result)

    return result
  }

  /** 仅执行单阶段（用于调试/对比） */
  processStage(rawSubs: SubtitleLite[], stage: 0 | 1 | 2 | 3 | 4): SubtitleLite[] {
    let result = [...rawSubs]
    result.sort((a, b) => a.startTime - b.startTime)
    if (stage >= 0) result = stage0_normalize(result)
    if (stage >= 1) result = stage1_filterJitter(result, this.opts)
    if (stage >= 2) result = stage2_mergeSplit(result, this.opts)
    if (stage >= 3) result = stage3_mergeSimilar(result, this.opts)
    if (stage >= 4) result = stage4_computeEndTime(result)
    return result
  }

  /** 更新管道参数（链式） */
  configure(updates: Partial<PipelineOptions>): this {
    this.opts = { ...this.opts, ...updates }
    return this
  }

  /** 获取当前配置 */
  getOptions(): PipelineOptions {
    return { ...this.opts }
  }

  /** 清空相似度缓存 */
  clearCache(): void {
    _similarityCache.clear()
  }
}
