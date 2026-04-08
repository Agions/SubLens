import { describe, it, expect } from 'vitest'
import {
  formatSRT,
  formatWebVTT,
  formatASS,
  formatCSV,
  formatLRC,
  formatSBV,
} from './subtitle'
import type { SubtitleItem } from './subtitle'

// Test helper to create a sample subtitle
function createSubtitle(overrides: Partial<SubtitleItem> = {}): SubtitleItem {
  return {
    id: 'test-1',
    index: 1,
    startTime: 1.5,
    endTime: 4.0,
    startFrame: 45,
    endFrame: 120,
    text: 'Hello, World!',
    confidence: 0.92,
    language: 'en',
    roi: {
      id: 'bottom',
      name: 'Bottom',
      type: 'bottom',
      x: 0,
      y: 85,
      width: 100,
      height: 15,
      unit: 'percent',
      enabled: true,
    },
    thumbnailUrls: [],
    edited: false,
    ...overrides,
  }
}

describe('Subtitle Formatting', () => {
  describe('SRT Format', () => {
    it('should format basic subtitle correctly', () => {
      const subtitles = [createSubtitle()]
      const result = formatSRT(subtitles)

      expect(result).toContain('1')
      expect(result).toContain('00:00:01,500 --> 00:00:04,000')
      expect(result).toContain('Hello, World!')
    })

    it('should format multiple subtitles with index', () => {
      const subtitles = [
        createSubtitle({ index: 1, startTime: 0.0, endTime: 2.0, text: 'First' }),
        createSubtitle({ index: 2, startTime: 2.0, endTime: 4.0, text: 'Second' }),
      ]
      const result = formatSRT(subtitles)

      expect(result).toContain('1\n00:00:00,000 --> 00:00:02,000\nFirst')
      expect(result).toContain('2\n00:00:02,000 --> 00:00:04,000\nSecond')
    })

    it('should handle milliseconds correctly', () => {
      const subtitles = [createSubtitle({ startTime: 1.5, endTime: 5.25 })]
      const result = formatSRT(subtitles)

      expect(result).toContain('00:00:01,500 --> 00:00:05,250')
    })
  })

  describe('VTT Format', () => {
    it('should include WEBVTT header', () => {
      const subtitles = [createSubtitle()]
      const result = formatWebVTT(subtitles)

      expect(result.startsWith('WEBVTT')).toBe(true)
    })

    it('should use dot separator for milliseconds', () => {
      const subtitles = [createSubtitle({ startTime: 1.5, endTime: 4.0 })]
      const result = formatWebVTT(subtitles)

      expect(result).toContain('00:00:01.500 --> 00:00:04.000')
    })
  })

  describe('ASS Format', () => {
    it('should include script info header', () => {
      const subtitles = [createSubtitle()]
      const result = formatASS(subtitles)

      expect(result).toContain('[Script Info]')
      expect(result).toContain('[V4+ Styles]')
      expect(result).toContain('[Events]')
    })

    it('should escape commas in text', () => {
      const subtitles = [createSubtitle({ text: 'Hello, World' })]
      const result = formatASS(subtitles)

      // Commas should be escaped as \,
      expect(result).toContain('Hello\\, World')
    })

    it('should convert newlines to \\N', () => {
      const subtitles = [createSubtitle({ text: 'Line 1\nLine 2' })]
      const result = formatASS(subtitles)

      expect(result).toContain('Line 1\\NLine 2')
    })
  })

  describe('CSV Format', () => {
    it('should include header row', () => {
      const subtitles = [createSubtitle()]
      const result = formatCSV(subtitles)

      expect(result.startsWith('Index,StartTime,EndTime,StartFrame,EndFrame,Text,Confidence')).toBe(true)
    })

    it('should escape quotes in text', () => {
      const subtitles = [createSubtitle({ text: 'He said "hi"' })]
      const result = formatCSV(subtitles)

      // Quotes should be doubled and wrapped
      expect(result).toContain('"He said ""hi"""')
    })
  })

  describe('LRC Format', () => {
    it('should include LRC metadata header', () => {
      const subtitles = [createSubtitle()]
      const result = formatLRC(subtitles)

      expect(result).toContain('[ti:HardSubX Export]')
      expect(result).toContain('[ar:HardSubX]')
    })

    it('should format timestamp correctly', () => {
      const subtitles = [createSubtitle({ startTime: 65.5 })] // 1m 5.5s
      const result = formatLRC(subtitles)

      expect(result).toContain('[01:05.50]')
    })
  })

  describe('SBV Format', () => {
    it('should use comma-separated timestamp format', () => {
      const subtitles = [createSubtitle({ startTime: 1.5, endTime: 4.0 })]
      const result = formatSBV(subtitles)

      // SBV uses MM:SS,mmm format
      expect(result).toContain('00:01,500')
    })
  })
})

describe('Timestamp Formatting', () => {
  it('should pad single digit values', () => {
    const subtitles = [createSubtitle({ startTime: 3661.5 })] // 1h 1m 1.5s
    const result = formatSRT(subtitles)

    expect(result).toContain('01:01:01,500')
  })

  it('should handle zero correctly', () => {
    const subtitles = [createSubtitle({ startTime: 0, endTime: 0 })]
    const result = formatSRT(subtitles)

    expect(result).toContain('00:00:00,000 --> 00:00:00,000')
  })
})

describe('Edge Cases', () => {
  it('should handle empty text', () => {
    const subtitles = [createSubtitle({ text: '' })]
    const result = formatSRT(subtitles)

    expect(result).toBeDefined()
  })

  it('should handle very long text', () => {
    const longText = 'A'.repeat(1000)
    const subtitles = [createSubtitle({ text: longText })]
    const result = formatSRT(subtitles)

    expect(result).toContain(longText)
  })

  it('should handle special characters', () => {
    const subtitles = [createSubtitle({ text: '<script>alert("xss")</script>' })]
    const result = formatSRT(subtitles)

    // Should not escape HTML in SRT (that's the viewer's job)
    expect(result).toContain('<script>')
  })
})
