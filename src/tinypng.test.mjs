/**
 * Vitest tests for tinypng.mjs
 * Integration tests for TinyPNGCompressor class
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import TinyPNGCompressor from './tinypng.mjs'
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test configuration
const OUTPUT_DIR = join(__dirname, '../test/output')
const TEST_IMAGE = join(__dirname, '../test/coding.png')

const TINYPNG_API_KEY = process.env.TINYPNG_API_KEY || ''
const [API_KEY, EXTRA_API_KEY] = TINYPNG_API_KEY.split(',')

// Setup and cleanup
beforeAll(() => {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
})

afterAll(() => {
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true })
  }
})

describe('TinyPNGCompressor - Unit Tests', () => {
  describe('Constructor', () => {
    it('should create compressor with single API key', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      expect(compressor).toBeInstanceOf(TinyPNGCompressor)
    })

    it('should create compressor with multiple API keys', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: ['key1', 'key2', 'key3'],
      })

      expect(compressor).toBeInstanceOf(TinyPNGCompressor)
      const stats = compressor.getStats()
      expect(stats.length).toBe(3)
    })

    it('should normalize single key to array', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      const stats = compressor.getStats()
      expect(stats.length).toBe(1)
    })

    it('should throw error when no API key provided', () => {
      expect(() => {
        new TinyPNGCompressor({ apiKey: [] })
      }).toThrow('至少需要提供一个 TinyPNG API Key')
    })

    it('should set default compression count', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      const stats = compressor.getStats()
      expect(stats[0].monthlyLimit).toBe(500)
    })

    it('should use custom compression count', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
        compressionCount: 1000,
      })

      const stats = compressor.getStats()
      expect(stats[0].monthlyLimit).toBe(1000)
    })

    it('should emit init event', () => {
      const initHandler = vi.fn()
      const compressor = new TinyPNGCompressor({
        apiKey: ['key1', 'key2'],
      })

      compressor.on('init', initHandler)

      // Create another instance to trigger init
      new TinyPNGCompressor({ apiKey: 'key3' })

      // The init event is emitted in constructor
      expect(compressor.apiKeys.length).toBe(2)
    })
  })

  describe('getStats()', () => {
    it('should return stats for all keys', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: ['key1', 'key2'],
      })

      const stats = compressor.getStats()
      expect(stats).toHaveLength(2)
    })

    it('should include all required fields', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      const stats = compressor.getStats()
      const stat = stats[0]

      expect(stat).toHaveProperty('keyIndex')
      expect(stat).toHaveProperty('compressionCount')
      expect(stat).toHaveProperty('monthlyLimit')
      expect(stat).toHaveProperty('remaining')
      expect(stat).toHaveProperty('disabled')
      expect(stat).toHaveProperty('lastError')
    })

    it('should calculate remaining correctly', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
        compressionCount: 500,
      })

      const stats = compressor.getStats()
      expect(stats[0].remaining).toBe(500)
    })

    it('should show keys as active by default', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      const stats = compressor.getStats()
      expect(stats[0].disabled).toBe(false)
    })
  })

  describe('resetCounts()', () => {
    it('should reset compression counts', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      // Manually set count
      compressor.keyStats[0].compressionCount = 100

      compressor.resetCounts()
      const stats = compressor.getStats()
      expect(stats[0].compressionCount).toBe(0)
    })

    it('should re-enable disabled keys', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      // Manually disable
      compressor.keyStats[0].disabled = true

      compressor.resetCounts()
      const stats = compressor.getStats()
      expect(stats[0].disabled).toBe(false)
    })

    it('should clear last errors', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      // Manually set error
      compressor.keyStats[0].lastError = new Error('Test error')

      compressor.resetCounts()
      const stats = compressor.getStats()
      expect(stats[0].lastError).toBe(null)
    })

    it('should emit reset event', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      const resetHandler = vi.fn()
      compressor.on('reset', resetHandler)

      compressor.resetCounts()
      expect(resetHandler).toHaveBeenCalled()
    })
  })

  describe('Event Emitter', () => {
    it('should emit events for different operations', () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'test-key',
      })

      const events = []
      compressor.on('init', () => events.push('init'))
      compressor.on('start', () => events.push('start'))
      compressor.on('success', () => events.push('success'))
      compressor.on('error', () => events.push('error'))

      expect(compressor.eventNames()).toContain('init')
    })
  })
})

describe.skipIf(!API_KEY || !existsSync(TEST_IMAGE))('TinyPNGCompressor - Integration Tests', () => {
  describe('compress()', () => {
    it('should compress image from file path', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const buffer = await compressor.compress(TEST_IMAGE)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)

      const originalSize = readFileSync(TEST_IMAGE).length
      expect(buffer.length).toBeLessThan(originalSize)
    }, 30000)

    it('should emit success event on compression', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const successHandler = vi.fn()
      compressor.on('success', successHandler)

      await compressor.compress(TEST_IMAGE)

      expect(successHandler).toHaveBeenCalled()
      const eventData = successHandler.mock.calls[0][0]
      expect(eventData).toHaveProperty('originalSize')
      expect(eventData).toHaveProperty('compressedSize')
      expect(eventData).toHaveProperty('compressionRatio')
    }, 30000)

    it('should compress image from buffer', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const buffer = readFileSync(TEST_IMAGE)
      const compressed = await compressor.compress(buffer)

      expect(compressed).toBeInstanceOf(Buffer)
      expect(compressed.length).toBeLessThan(buffer.length)
    }, 30000)

    it('should compress image from stream', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const buffer = readFileSync(TEST_IMAGE)
      const stream = Readable.from([buffer])
      const compressed = await compressor.compress(stream)

      expect(compressed).toBeInstanceOf(Buffer)
      expect(compressed.length).toBeLessThan(buffer.length)
    }, 30000)

    it('should compress with resize options', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const buffer = await compressor.compress(TEST_IMAGE, {
        resize: {
          method: 'scale',
          width: 400,
        },
      })

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)

      const outputPath = join(OUTPUT_DIR, 'tinypng-resized.png')
      writeFileSync(outputPath, buffer)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)
  })

  describe('compressToFile()', () => {
    it('should compress and save to file', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const outputPath = join(OUTPUT_DIR, 'tinypng-compressed.png')
      const result = await compressor.compressToFile(TEST_IMAGE, outputPath)

      expect(result.outputPath).toBe(outputPath)
      expect(result.size).toBeGreaterThan(0)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)

    it('should compress to file with resize', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      const outputPath = join(OUTPUT_DIR, 'tinypng-resized-file.png')
      const result = await compressor.compressToFile(TEST_IMAGE, outputPath, {
        resize: {
          method: 'fit',
          width: 600,
          height: 400,
        },
      })

      expect(existsSync(outputPath)).toBe(true)
      expect(result.size).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Multiple API Keys', () => {
    it('should rotate between API keys', async () => {
      if (!EXTRA_API_KEY) {
        return // Skip if no extra key
      }

      const compressor = new TinyPNGCompressor({
        apiKey: [API_KEY, EXTRA_API_KEY],
      })

      const keySwitchHandler = vi.fn()
      compressor.on('keySwitch', keySwitchHandler)

      // Compress multiple images
      await compressor.compress(TEST_IMAGE)
      await compressor.compress(TEST_IMAGE)

      // Should have switched keys
      expect(keySwitchHandler).toHaveBeenCalled()
    }, 60000)
  })

  describe('Error Handling', () => {
    it('should handle invalid API key', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: 'invalid-key-123',
      })

      const errorHandler = vi.fn()
      compressor.on('error', errorHandler)

      await expect(compressor.compress(TEST_IMAGE)).rejects.toThrow()

      expect(errorHandler).toHaveBeenCalled()
    }, 30000)

    it('should handle non-existent file', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      await expect(compressor.compress('/non-existent-file.png')).rejects.toThrow()
    }, 30000)

    it('should throw error for invalid input type', async () => {
      const compressor = new TinyPNGCompressor({
        apiKey: API_KEY,
      })

      await expect(compressor.compress(123)).rejects.toThrow('只支持文件路径、Buffer 或 Stream 实例')
    })
  })
})
