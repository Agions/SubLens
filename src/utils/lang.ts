/**
 * Language code utilities
 */

/**
 * Maps UI language codes to Tesseract OCR language codes.
 * Used by batch processor to initialize OCR engines.
 */
export const LANG_CODE_MAP: Record<string, string[]> = {
  ch: ['eng', 'chi_sim'],
  en: ['eng'],
  ja: ['eng', 'jpn'],
  ko: ['eng', 'kor'],
}

/**
 * Resolve OCR languages for a given UI language code.
 * Returns ['eng'] as fallback for unknown codes.
 */
export function resolveOcrLanguages(uiLang: string): string[] {
  return LANG_CODE_MAP[uiLang] ?? ['eng']
}
