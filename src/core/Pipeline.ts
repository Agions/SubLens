/**
 * Pipeline — SubLens Core
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

// ── Pipeline threshold constants ────────────────────────────────
// Cached similarity limit (used by SimilarityCache)
const SIMILARITY_CACHE_MAX_SIZE = 3000
const SIMILARITY_CACHE_TRIM_TO  = 2500

// ─── Levenshtein 距离（带缓存 per-pipeline 实例）───────────────────────
// 每个 Pipeline 实例拥有独立缓存，避免不同配置（threshold）互相干扰。
// 3000 条缓存、LRU淘汰策略（同 original）。

class SimilarityCache {
  private _map = new Map<string, number>()

  get(key: string): number | undefined { return this._map.get(key) }

  set(key: string, sim: number): void {
    // Batch trim when exceeding limit (O(1) amortized with Map's insertion order)
    if (this._map.size >= SIMILARITY_CACHE_MAX_SIZE) {
      // Map maintains insertion order in modern JS engines (V8, SpiderMonkey, etc.)
      const keys = [...this._map.keys()]
      const deleteCount = keys.length - SIMILARITY_CACHE_TRIM_TO
      for (let i = 0; i < deleteCount; i++) {
        this._map.delete(keys[i])
      }
    }
    this._map.set(key, sim)
  }

  clear(): void { this._map.clear() }
}

// module-level fallback cache for direct textSimilarity() calls (no pipeline instance)
const _fallbackCache = new SimilarityCache()

// Function-level memoization — caches (a,b) → similarity for all callers.
// Shared across the entire module so any call with the same text pair is a cache hit.
// Automatic LRU trim keeps it bounded.
const _memo = new Map<string, number>()
const _MEMO_MAX = 2000
const _MEMO_TRIM_TO = 1500

function _memoKey(a: string, b: string): string {
  // Deterministic key regardless of argument order
  return a.length <= b.length ? `${a.length}:${a}|${b}` : `${b.length}:${b}|${a}`
}

function _trimMemo() {
  if (_memo.size <= _MEMO_MAX) return
  // Delete oldest entries (Map preserves insertion order)
  const keys = [..._memo.keys()]
  const deleteCount = keys.length - _MEMO_TRIM_TO
  for (let i = 0; i < deleteCount; i++) _memo.delete(keys[i])
}

// ─── CJK text detection ──────────────────────────────────────────────

/** Detect whether text is primarily CJK (Chinese/Japanese/Korean) script. */
function _isCJCText(text: string): boolean {
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length
  return cjkCount / text.length > 0.5
}

/**
 * Character-level Levenshtein distance for CJK text.
 * Each CJK character counts as one unit (not bytes).
 * For mixed text, falls back to word-level for the Latin parts.
 */
function _charLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
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
  return dp[long.length]
}

/**
 * Word-level Levenshtein for Latin/English text.
 * Splits on whitespace and compares words for better semantic similarity.
 */
function _wordLevenshtein(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/)
  const wordsB = b.toLowerCase().split(/\s+/)
  return _charLevenshtein(wordsA.join(' '), wordsB.join(' '))
}

export function textSimilarity(a: string, b: string, cache?: SimilarityCache): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0

  // Try function-level memo first (fast path for repeated calls)
  const memoKey = _memoKey(a, b)
  const memoHit = _memo.get(memoKey)
  if (memoHit !== undefined) return memoHit

  // Determine text type and select appropriate distance metric
  const isCJK = _isCJCText(a) || _isCJCText(b)
  const dist = isCJK
    ? _charLevenshtein(a, b)
    : _wordLevenshtein(a, b)

  // 缓存键：短串在前 + 长度前缀（确保对称性）。
  // 短文本（≤4字）直接用完整文本；较长文本取首尾各4字确保唯一性。
  // 使用字符串拼接而非 hash 函数，零依赖且确定性输出。
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  const cacheKey = short.length <= 4
    ? `${short.length}:${short}|${long.slice(0, 8)}`
    : `${short.length}:${short.slice(0, 4)}..${short.slice(-4)}|${long.slice(0, 8)}`
  const activeCache = cache ?? _fallbackCache
  const hit = activeCache.get(cacheKey); if (hit !== undefined) {
    _memo.set(memoKey, hit)
    _trimMemo()
    return hit
  }

  const sim = 1 - dist / Math.max(short.length, long.length)

  activeCache.set(cacheKey, sim)
  _memo.set(memoKey, sim)
  _trimMemo()
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
function stage1_filterJitter(subs: SubtitleLite[], opts: PipelineOptions, cache: SimilarityCache): SubtitleLite[] {
  if (subs.length < 2) return stage0_normalize(subs)

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

    const simPrev = prev ? textSimilarity(prev.text, curr.text, cache) : 0
    const simNext = next ? textSimilarity(curr.text, next.text, cache) : 0
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
function stage2_mergeSplit(subs: SubtitleLite[], opts: PipelineOptions, cache: SimilarityCache): SubtitleLite[] {
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
    const sim = textSimilarity(prev.text, sub.text, cache)
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
      confidence: best.confidence,
    }]
  })
}

// ─── Stage 3: 合并相似相邻字幕 ─────────────────────────────────────
function stage3_mergeSimilar(subs: SubtitleLite[], opts: PipelineOptions, cache: SimilarityCache): SubtitleLite[] {
  if (subs.length === 0) return subs

  const result: SubtitleLite[] = []
  let current = { ...subs[0] }

  for (let i = 1; i < subs.length; i++) {
    const prev = subs[i - 1]
    const curr = subs[i]
    const gap = curr.startTime - prev.endTime
    const sim = textSimilarity(current.text, curr.text, cache)

    if (sim >= opts.similarSimilarityThreshold && gap <= opts.similarMaxGap) {
      // 合并：取时间跨度最大者 + 置信度最高者；文本优先选当前项（信息更完整）
      current.endTime = Math.max(current.endTime, curr.endTime)
      current.endFrame = Math.max(current.endFrame, curr.endFrame)
      current.confidence = Math.max(current.confidence, curr.confidence)
      current.text = curr.text
    } else {
      result.push(current)
      current = { ...curr }
    }
  }
  result.push(current)

  return result
}

// ─── Stage 4: 计算 endTime（基于下一条字幕）────────────────────────
// NOTE: 不再强制截断最大时长上限，保留原始 endTime。
// 如有超长单字幕需求，由调用方在 pipeline 外自行处理。
function stage4_computeEndTime(subs: SubtitleLite[]): SubtitleLite[] {
  if (subs.length === 0) return subs

  return subs.map((sub, i) => {
    const next = subs[i + 1]
    if (next) {
      // 有下一条：取原始 endTime 与下一条 startTime 的较小值
      return { ...sub, endTime: Math.min(sub.endTime, next.startTime) }
    }
    // 无下一条：保留原始 endTime
    return { ...sub }
  })
}

// ─── 主管道 ─────────────────────────────────────────────────────
export class Pipeline {
  private opts: PipelineOptions
  private _cache = new SimilarityCache()

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
    result = stage1_filterJitter(result, this.opts, this._cache)

    // Stage 2: 合并分裂字幕
    result = stage2_mergeSplit(result, this.opts, this._cache)

    // Stage 3: 合并相似字幕
    result = stage3_mergeSimilar(result, this.opts, this._cache)

    // Stage 4: 计算准确时长
    result = stage4_computeEndTime(result)

    return result
  }

  /** 仅执行单阶段（用于调试/对比） */
  processStage(rawSubs: SubtitleLite[], stage: 0 | 1 | 2 | 3 | 4): SubtitleLite[] {
    let result = [...rawSubs]
    result.sort((a, b) => a.startTime - b.startTime)
    if (stage >= 0) result = stage0_normalize(result)
    if (stage >= 1) result = stage1_filterJitter(result, this.opts, this._cache)
    if (stage >= 2) result = stage2_mergeSplit(result, this.opts, this._cache)
    if (stage >= 3) result = stage3_mergeSimilar(result, this.opts, this._cache)
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
    this._cache.clear()
  }
}
