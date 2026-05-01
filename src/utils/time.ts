/**
 * Time formatting utilities
 * Consolidated from Timeline.vue, useSubtitleList.ts, and SubtitleExporter.ts
 */

// ── Constants ─────────────────────────────────────────────────
const HOURS_IN_SECONDS = 3600
const MINUTES_IN_SECONDS = 60
const MS_PER_SECOND = 1000

// ── Formatters ─────────────────────────────────────────────────

/**
 * Format seconds to short time (M:SS or H:MM:SS)
 * Used for UI display
 */
export function formatTimeShort(seconds: number): string {
  const hrs = Math.floor(seconds / HOURS_IN_SECONDS)
  const mins = Math.floor((seconds % HOURS_IN_SECONDS) / MINUTES_IN_SECONDS)
  const secs = Math.floor(seconds % MINUTES_IN_SECONDS)
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format seconds to SRT format (HH:MM:SS,mmm)
 * Used for .srt subtitle files
 */
export function formatTimeSrt(seconds: number): string {
  const hrs = Math.floor(seconds / HOURS_IN_SECONDS)
  const mins = Math.floor((seconds % HOURS_IN_SECONDS) / MINUTES_IN_SECONDS)
  const secs = Math.floor(seconds % MINUTES_IN_SECONDS)
  const ms = Math.floor((seconds % 1) * MS_PER_SECOND)
  
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${ms.toString().padStart(3, '0')}`
}

/**
 * Format seconds to ASS/SSA format (H:MM:SS.cc)
 * Used for .ass/.ssa subtitle files
 */
export function formatTimeAss(seconds: number): string {
  const hrs = Math.floor(seconds / HOURS_IN_SECONDS)
  const mins = Math.floor((seconds % HOURS_IN_SECONDS) / MINUTES_IN_SECONDS)
  const secs = Math.floor(seconds % MINUTES_IN_SECONDS)
  const cs = Math.floor((seconds % 1) * 100) // centiseconds
  
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

/**
 * Format frame number to time string (M:SS or H:MM:SS)
 * Used in Timeline component
 */
export function formatFrameToTime(frame: number, fps: number): string {
  const seconds = frame / fps
  return formatTimeShort(seconds)
}

// ── Parsers ──────────────────────────────────────────────────

/**
 * Parse time string (HH:MM:SS,mmm or HH:MM:SS.mmm) to seconds
 * Returns -1 on parse failure
 */
export function parseTime(timeStr: string): number {
  const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})[,\.](\d{3})$/)
  if (!match) return -1
  
  const [, hrs, mins, secs, ms] = match
  return (
    parseInt(hrs, 10) * HOURS_IN_SECONDS +
    parseInt(mins, 10) * MINUTES_IN_SECONDS +
    parseInt(secs, 10) +
    parseInt(ms, 10) / MS_PER_SECOND
  )
}

/**
 * Convert frame number to seconds
 */
export function frameToSeconds(frame: number, fps: number): number {
  return frame / fps
}

/**
 * Convert seconds to frame number
 */
export function secondsToFrame(seconds: number, fps: number): number {
  return Math.floor(seconds * fps)
}

/**
 * Format seconds to MM:SS.mmm (milliseconds with dot separator)
 * Used for timeline hover bubble in VideoPreview
 */
export function formatTimePrecise(seconds: number): string {
  const mins = Math.floor(seconds / MINUTES_IN_SECONDS)
  const secs = Math.floor(seconds % MINUTES_IN_SECONDS)
  const ms = Math.floor((seconds % 1) * MS_PER_SECOND)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

/**
 * Format frame number with thousand separators
 */
export function formatFrameNumber(frame: number): string {
  return frame.toLocaleString()
}
