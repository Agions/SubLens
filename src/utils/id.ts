/**
 * ID generation utilities
 */

/**
 * Generate a cryptographically secure unique ID
 * Falls back to timestamp + random for environments without crypto.randomUUID
 */
export function generateId(prefix = 'id'): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
