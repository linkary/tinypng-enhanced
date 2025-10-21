/**
 * Unit tests for progress.mjs
 */

import { describe, it, expect } from 'vitest'
import {
  calculateProgressInRange,
  calculateUploadProgress,
  calculateDownloadProgress,
  calculateResizeProgress,
  formatProgressMessage,
} from './progress.mjs'

describe('progress utils', () => {
  describe('calculateProgressInRange()', () => {
    it('should calculate progress within range correctly', () => {
      // 50% through 0.0 to 1.0 range = 0.5
      expect(calculateProgressInRange(50, 100, 0.0, 1.0)).toBe(0.5)

      // 50% through 0.2 to 0.8 range = 0.5
      expect(calculateProgressInRange(50, 100, 0.2, 0.8)).toBe(0.5)

      // 100% through 0.0 to 0.5 range = 0.5
      expect(calculateProgressInRange(100, 100, 0.0, 0.5)).toBe(0.5)
    })

    it('should return start percent when no bytes processed', () => {
      expect(calculateProgressInRange(0, 100, 0.2, 0.8)).toBe(0.2)
      expect(calculateProgressInRange(0, 100, 0.5, 0.9)).toBe(0.5)
    })

    it('should return end percent when all bytes processed', () => {
      expect(calculateProgressInRange(100, 100, 0.2, 0.8)).toBe(0.8)
      expect(calculateProgressInRange(50, 50, 0.5, 0.9)).toBe(0.9)
    })

    it('should handle zero total bytes', () => {
      expect(calculateProgressInRange(0, 0, 0.2, 0.8)).toBe(0.2)
      expect(calculateProgressInRange(50, 0, 0.3, 0.7)).toBe(0.3)
    })

    it('should handle negative total bytes', () => {
      expect(calculateProgressInRange(50, -100, 0.2, 0.8)).toBe(0.2)
    })

    it('should calculate intermediate progress points', () => {
      // 25% through 0.2 to 0.8 range = 0.2 + 0.25 * 0.6 = 0.35
      expect(calculateProgressInRange(25, 100, 0.2, 0.8)).toBeCloseTo(0.35, 10)

      // 75% through 0.2 to 0.8 range = 0.2 + 0.75 * 0.6 = 0.65
      expect(calculateProgressInRange(75, 100, 0.2, 0.8)).toBeCloseTo(0.65, 10)
    })

    it('should handle full range (0 to 1)', () => {
      expect(calculateProgressInRange(0, 100, 0, 1)).toBe(0.0)
      expect(calculateProgressInRange(50, 100, 0, 1)).toBe(0.5)
      expect(calculateProgressInRange(100, 100, 0, 1)).toBe(1.0)
    })

    it('should handle small ranges', () => {
      // 50% through 0.5 to 0.6 range = 0.55
      expect(calculateProgressInRange(50, 100, 0.5, 0.6)).toBeCloseTo(0.55, 10)

      // 50% through 0.9 to 1.0 range = 0.95
      expect(calculateProgressInRange(50, 100, 0.9, 1.0)).toBeCloseTo(0.95, 10)
    })
  })

  describe('calculateUploadProgress()', () => {
    it('should map upload progress to 5%-35% range', () => {
      // 0% uploaded = 5% overall
      expect(calculateUploadProgress(0, 100)).toBe(0.05)

      // 50% uploaded = 20% overall (5% + 50% of 30%)
      expect(calculateUploadProgress(50, 100)).toBe(0.2)

      // 100% uploaded = 35% overall
      expect(calculateUploadProgress(100, 100)).toBe(0.35)
    })

    it('should handle various upload sizes', () => {
      const totalBytes = 1024 * 1024 // 1MB

      // Start
      expect(calculateUploadProgress(0, totalBytes)).toBe(0.05)

      // Quarter uploaded
      expect(calculateUploadProgress(totalBytes / 4, totalBytes)).toBeCloseTo(0.125, 10)

      // Half uploaded
      expect(calculateUploadProgress(totalBytes / 2, totalBytes)).toBe(0.2)

      // Complete
      expect(calculateUploadProgress(totalBytes, totalBytes)).toBe(0.35)
    })

    it('should handle zero bytes', () => {
      expect(calculateUploadProgress(0, 0)).toBe(0.05)
    })
  })

  describe('calculateDownloadProgress()', () => {
    it('should map download progress to 60%-90% range', () => {
      // 0% downloaded = 60% overall
      expect(calculateDownloadProgress(0, 100)).toBe(0.6)

      // 50% downloaded = 75% overall (60% + 50% of 30%)
      expect(calculateDownloadProgress(50, 100)).toBe(0.75)

      // 100% downloaded = 90% overall
      expect(calculateDownloadProgress(100, 100)).toBe(0.9)
    })

    it('should handle various download sizes', () => {
      const totalBytes = 512 * 1024 // 512KB

      // Start
      expect(calculateDownloadProgress(0, totalBytes)).toBe(0.6)

      // Quarter downloaded
      expect(calculateDownloadProgress(totalBytes / 4, totalBytes)).toBeCloseTo(0.675, 10)

      // Half downloaded
      expect(calculateDownloadProgress(totalBytes / 2, totalBytes)).toBe(0.75)

      // Complete
      expect(calculateDownloadProgress(totalBytes, totalBytes)).toBe(0.9)
    })

    it('should handle zero bytes', () => {
      expect(calculateDownloadProgress(0, 0)).toBe(0.6)
    })
  })

  describe('calculateResizeProgress()', () => {
    it('should map resize progress to 50%-85% range', () => {
      // 0% resized = 50% overall
      expect(calculateResizeProgress(0, 100)).toBe(0.5)

      // 50% resized = 67.5% overall (50% + 50% of 35%)
      expect(calculateResizeProgress(50, 100)).toBe(0.675)

      // 100% resized = 85% overall
      expect(calculateResizeProgress(100, 100)).toBe(0.85)
    })

    it('should handle various resize sizes', () => {
      const totalBytes = 256 * 1024 // 256KB

      // Start
      expect(calculateResizeProgress(0, totalBytes)).toBe(0.5)

      // Quarter resized
      expect(calculateResizeProgress(totalBytes / 4, totalBytes)).toBeCloseTo(0.5875, 10)

      // Half resized
      expect(calculateResizeProgress(totalBytes / 2, totalBytes)).toBe(0.675)

      // Complete
      expect(calculateResizeProgress(totalBytes, totalBytes)).toBe(0.85)
    })

    it('should handle zero bytes', () => {
      expect(calculateResizeProgress(0, 0)).toBe(0.5)
    })
  })

  describe('formatProgressMessage()', () => {
    it('should format progress message with percentage', () => {
      expect(formatProgressMessage('Uploading', 0.5)).toBe('Uploading... (50%)')
      expect(formatProgressMessage('Downloading', 0.75)).toBe('Downloading... (75%)')
      expect(formatProgressMessage('Compressing', 0.2)).toBe('Compressing... (20%)')
    })

    it('should round progress to nearest integer', () => {
      expect(formatProgressMessage('Processing', 0.333)).toBe('Processing... (33%)')
      expect(formatProgressMessage('Processing', 0.666)).toBe('Processing... (67%)')
      expect(formatProgressMessage('Processing', 0.999)).toBe('Processing... (100%)')
    })

    it('should handle 0% and 100%', () => {
      expect(formatProgressMessage('Starting', 0.0)).toBe('Starting... (0%)')
      expect(formatProgressMessage('Complete', 1.0)).toBe('Complete... (100%)')
    })

    it('should handle various stage names', () => {
      const stages = ['Uploading', 'Compressing', 'Resizing', 'Downloading', 'Converting']
      stages.forEach(stage => {
        const message = formatProgressMessage(stage, 0.5)
        expect(message).toContain(stage)
        expect(message).toContain('50%')
        expect(message).toMatch(/^.+\.\.\. \(\d+%\)$/)
      })
    })

    it('should handle small progress values', () => {
      expect(formatProgressMessage('Starting', 0.01)).toBe('Starting... (1%)')
      expect(formatProgressMessage('Starting', 0.05)).toBe('Starting... (5%)')
    })

    it('should handle near-complete progress', () => {
      expect(formatProgressMessage('Finishing', 0.95)).toBe('Finishing... (95%)')
      expect(formatProgressMessage('Finishing', 0.99)).toBe('Finishing... (99%)')
    })

    it('should handle empty stage name', () => {
      expect(formatProgressMessage('', 0.5)).toBe('... (50%)')
    })

    it('should handle progress > 1', () => {
      expect(formatProgressMessage('Over', 1.5)).toBe('Over... (150%)')
    })

    it('should handle negative progress (edge case)', () => {
      expect(formatProgressMessage('Negative', -0.5)).toBe('Negative... (-50%)')
    })
  })

  describe('Progress ranges integration', () => {
    it('should have non-overlapping ranges for workflow stages', () => {
      // Upload: 5% - 35%
      const uploadStart = calculateUploadProgress(0, 100)
      const uploadEnd = calculateUploadProgress(100, 100)

      // Download: 60% - 90%
      const downloadStart = calculateDownloadProgress(0, 100)
      const downloadEnd = calculateDownloadProgress(100, 100)

      // Resize: 50% - 85%
      const resizeStart = calculateResizeProgress(0, 100)
      const resizeEnd = calculateResizeProgress(100, 100)

      // Upload should complete before download starts
      expect(uploadEnd).toBeLessThan(downloadStart)

      // Resize starts before download but overlaps
      expect(resizeStart).toBeLessThan(downloadStart)
      expect(resizeEnd).toBeGreaterThan(downloadStart)
      expect(resizeEnd).toBeLessThan(downloadEnd)
    })

    it('should provide smooth progress through full compression workflow', () => {
      const workflow = [
        { stage: 'Upload start', progress: calculateUploadProgress(0, 100) },
        { stage: 'Upload end', progress: calculateUploadProgress(100, 100) },
        { stage: 'Download start', progress: calculateDownloadProgress(0, 100) },
        { stage: 'Download end', progress: calculateDownloadProgress(100, 100) },
      ]

      // Each stage should progress forward
      for (let i = 1; i < workflow.length; i++) {
        expect(workflow[i].progress).toBeGreaterThanOrEqual(workflow[i - 1].progress)
      }

      // Should start at 5% and end at 90%
      expect(workflow[0].progress).toBe(0.05)
      expect(workflow[workflow.length - 1].progress).toBe(0.9)
    })
  })
})
