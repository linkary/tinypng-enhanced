/**
 * Unit tests for compression.mjs
 */

import { describe, it, expect } from 'vitest'
import { calculateCompressionRatio, calculateSavedBytes, formatSize } from './compression.mjs'

describe('compression utils', () => {
  describe('calculateCompressionRatio()', () => {
    it('should calculate compression ratio correctly', () => {
      // 100KB -> 60KB = 40% compression
      expect(calculateCompressionRatio(100000, 60000)).toBe('40.00')

      // 1MB -> 500KB = 50% compression
      expect(calculateCompressionRatio(1024 * 1024, 512 * 1024)).toBe('50.00')

      // 200KB -> 50KB = 75% compression
      expect(calculateCompressionRatio(200000, 50000)).toBe('75.00')
    })

    it('should handle no compression (same size)', () => {
      expect(calculateCompressionRatio(100000, 100000)).toBe('0.00')
    })

    it('should handle edge case where compressed is larger', () => {
      // This shouldn't happen in practice, but the formula should handle it
      const result = calculateCompressionRatio(100000, 120000)
      expect(parseFloat(result)).toBeLessThan(0)
    })

    it('should return "0.00" for zero original size', () => {
      expect(calculateCompressionRatio(0, 0)).toBe('0.00')
      expect(calculateCompressionRatio(0, 100)).toBe('0.00')
    })

    it('should handle negative sizes gracefully', () => {
      expect(calculateCompressionRatio(-100, 50)).toBe('0.00')
    })

    it('should format result with 2 decimal places', () => {
      // 100KB -> 67KB = 33% compression
      const result = calculateCompressionRatio(100000, 67000)
      expect(result).toMatch(/^\d+\.\d{2}$/)
      expect(result).toBe('33.00')
    })

    it('should handle very small compressions', () => {
      // 100KB -> 99KB = 1% compression
      expect(calculateCompressionRatio(100000, 99000)).toBe('1.00')
    })

    it('should handle very large compressions', () => {
      // 100KB -> 5KB = 95% compression
      expect(calculateCompressionRatio(100000, 5000)).toBe('95.00')
    })

    it('should handle real-world TinyPNG compression ratios', () => {
      // Real example from test images
      expect(calculateCompressionRatio(23885, 7587)).toBe('68.24')
      expect(calculateCompressionRatio(14610, 5084)).toBe('65.20') // Actual result
      expect(calculateCompressionRatio(4653, 3244)).toBe('30.28')
    })
  })

  describe('calculateSavedBytes()', () => {
    it('should calculate saved bytes correctly', () => {
      expect(calculateSavedBytes(100000, 60000)).toBe(40000)
      expect(calculateSavedBytes(1024 * 1024, 512 * 1024)).toBe(512 * 1024)
      expect(calculateSavedBytes(200000, 50000)).toBe(150000)
    })

    it('should return 0 when no bytes saved', () => {
      expect(calculateSavedBytes(100000, 100000)).toBe(0)
    })

    it('should return 0 when compressed is larger (not negative)', () => {
      // Edge case protection - use Math.max(0, ...)
      expect(calculateSavedBytes(100000, 120000)).toBe(0)
    })

    it('should handle zero sizes', () => {
      expect(calculateSavedBytes(0, 0)).toBe(0)
      expect(calculateSavedBytes(100, 0)).toBe(100)
      expect(calculateSavedBytes(0, 100)).toBe(0)
    })

    it('should handle real-world examples', () => {
      expect(calculateSavedBytes(23885, 7587)).toBe(16298)
      expect(calculateSavedBytes(14610, 5084)).toBe(9526)
    })
  })

  describe('formatSize()', () => {
    it('should format bytes correctly', () => {
      expect(formatSize(0)).toBe('0 B')
      expect(formatSize(1)).toBe('1 B')
      expect(formatSize(500)).toBe('500 B')
      expect(formatSize(1023)).toBe('1023 B')
    })

    it('should format kilobytes correctly', () => {
      expect(formatSize(1024)).toBe('1.00 KB')
      expect(formatSize(2048)).toBe('2.00 KB')
      expect(formatSize(1536)).toBe('1.50 KB')
      expect(formatSize(10240)).toBe('10.00 KB')
      expect(formatSize(102400)).toBe('100.00 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatSize(1024 * 1024)).toBe('1.00 MB')
      expect(formatSize(2 * 1024 * 1024)).toBe('2.00 MB')
      expect(formatSize(1.5 * 1024 * 1024)).toBe('1.50 MB')
      expect(formatSize(10 * 1024 * 1024)).toBe('10.00 MB')
    })

    it('should use 2 decimal places for KB and MB', () => {
      expect(formatSize(1536)).toMatch(/^\d+\.\d{2} KB$/)
      expect(formatSize(1.5 * 1024 * 1024)).toMatch(/^\d+\.\d{2} MB$/)
    })

    it('should handle edge cases at boundaries', () => {
      expect(formatSize(1023)).toBe('1023 B') // Just below 1KB
      expect(formatSize(1024)).toBe('1.00 KB') // Exactly 1KB
      expect(formatSize(1025)).toBe('1.00 KB') // Just above 1KB

      expect(formatSize(1024 * 1024 - 1)).toBe('1024.00 KB') // Just below 1MB
      expect(formatSize(1024 * 1024)).toBe('1.00 MB') // Exactly 1MB
      expect(formatSize(1024 * 1024 + 1)).toBe('1.00 MB') // Just above 1MB
    })

    it('should handle real-world file sizes', () => {
      expect(formatSize(23885)).toBe('23.33 KB')
      expect(formatSize(7587)).toBe('7.41 KB')
      expect(formatSize(14610)).toBe('14.27 KB')
      expect(formatSize(5084)).toBe('4.96 KB')
    })

    it('should handle very large sizes', () => {
      expect(formatSize(100 * 1024 * 1024)).toBe('100.00 MB')
      expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe('1536.00 MB') // Doesn't handle GB
    })

    it('should handle fractional bytes', () => {
      // The function doesn't floor the value, it just formats whatever is passed
      expect(formatSize(1.5)).toBe('1.5 B')
      expect(formatSize(999.9)).toBe('999.9 B')
    })
  })
})
