/**
 * Unit tests for event.mjs
 */

import { describe, it, expect } from 'vitest'
import {
  createStartEvent,
  createCompressingEvent,
  createProgressEvent,
  createQuotaUpdateEvent,
  createSuccessEvent,
  createErrorEvent,
  createKeyErrorEvent,
} from './event.mjs'

describe('event utils', () => {
  describe('createStartEvent()', () => {
    it('should create start event with all fields', () => {
      const event = createStartEvent('file', 'test.png', 102400)

      expect(event).toEqual({
        type: 'file',
        filename: 'test.png',
        size: 102400,
      })
    })

    it('should handle null size', () => {
      const event = createStartEvent('url', 'https://example.com/image.png', null)

      expect(event).toEqual({
        type: 'url',
        filename: 'https://example.com/image.png',
        size: null,
      })
    })

    it('should handle various source types', () => {
      expect(createStartEvent('file', 'test.png', 100).type).toBe('file')
      expect(createStartEvent('buffer', 'test.png', 100).type).toBe('buffer')
      expect(createStartEvent('stream', 'test.png', 100).type).toBe('stream')
      expect(createStartEvent('url', 'test.png', 100).type).toBe('url')
    })
  })

  describe('createCompressingEvent()', () => {
    it('should create compressing event with known compression count', () => {
      const event = createCompressingEvent(0, 1, 3, 50, 500)

      expect(event).toEqual({
        keyIndex: 0,
        attempt: 1,
        maxRetries: 3,
        compressionCount: 50,
        remaining: 450,
      })
    })

    it('should handle null compression count', () => {
      const event = createCompressingEvent(1, 1, 3, null, 500)

      expect(event).toEqual({
        keyIndex: 1,
        attempt: 1,
        maxRetries: 3,
        compressionCount: null,
        remaining: 'unknown',
      })
    })

    it('should calculate remaining correctly', () => {
      expect(createCompressingEvent(0, 1, 3, 0, 500).remaining).toBe(500)
      expect(createCompressingEvent(0, 1, 3, 250, 500).remaining).toBe(250)
      expect(createCompressingEvent(0, 1, 3, 499, 500).remaining).toBe(1)
      expect(createCompressingEvent(0, 1, 3, 500, 500).remaining).toBe(0)
    })

    it('should handle multiple retry attempts', () => {
      expect(createCompressingEvent(0, 1, 3, 50, 500).attempt).toBe(1)
      expect(createCompressingEvent(0, 2, 3, 50, 500).attempt).toBe(2)
      expect(createCompressingEvent(0, 3, 3, 50, 500).attempt).toBe(3)
    })
  })

  describe('createProgressEvent()', () => {
    it('should create progress event with required fields', () => {
      const event = createProgressEvent('uploading', 0.5, 'Uploading... (50%)')

      expect(event).toEqual({
        stage: 'uploading',
        progress: 0.5,
        message: 'Uploading... (50%)',
      })
    })

    it('should include extra data if provided', () => {
      const event = createProgressEvent('uploading', 0.3, 'Uploading...', {
        bytesUploaded: 30000,
        totalBytes: 100000,
      })

      expect(event).toEqual({
        stage: 'uploading',
        progress: 0.3,
        message: 'Uploading...',
        bytesUploaded: 30000,
        totalBytes: 100000,
      })
    })

    it('should handle various stages', () => {
      const stages = ['uploading', 'compressed', 'resizing', 'downloading', 'complete']
      stages.forEach(stage => {
        const event = createProgressEvent(stage, 0.5, `${stage}...`)
        expect(event.stage).toBe(stage)
      })
    })

    it('should handle empty extra data', () => {
      const event = createProgressEvent('uploading', 0.5, 'Uploading...', {})

      expect(event).toEqual({
        stage: 'uploading',
        progress: 0.5,
        message: 'Uploading...',
      })
    })

    it('should handle progress boundaries', () => {
      expect(createProgressEvent('start', 0.0, 'Starting').progress).toBe(0.0)
      expect(createProgressEvent('complete', 1.0, 'Complete').progress).toBe(1.0)
    })
  })

  describe('createQuotaUpdateEvent()', () => {
    it('should create quota update event', () => {
      const event = createQuotaUpdateEvent(0, 100, 500)

      expect(event).toEqual({
        keyIndex: 0,
        compressionCount: 100,
        remaining: 400,
      })
    })

    it('should calculate remaining correctly', () => {
      expect(createQuotaUpdateEvent(0, 0, 500).remaining).toBe(500)
      expect(createQuotaUpdateEvent(0, 250, 500).remaining).toBe(250)
      expect(createQuotaUpdateEvent(0, 500, 500).remaining).toBe(0)
    })

    it('should handle multiple keys', () => {
      expect(createQuotaUpdateEvent(0, 100, 500).keyIndex).toBe(0)
      expect(createQuotaUpdateEvent(1, 200, 500).keyIndex).toBe(1)
      expect(createQuotaUpdateEvent(2, 300, 500).keyIndex).toBe(2)
    })
  })

  describe('createSuccessEvent()', () => {
    it('should create success event with all fields', () => {
      const event = createSuccessEvent(0, 100000, 60000, '40.00', 'test.png', 100, 500)

      expect(event).toEqual({
        keyIndex: 0,
        originalSize: 100000,
        compressedSize: 60000,
        savedBytes: 40000,
        compressionRatio: '40.00%',
        filename: 'test.png',
        compressionCount: 100,
        remaining: 400,
      })
    })

    it('should calculate saved bytes correctly', () => {
      const event = createSuccessEvent(0, 200000, 50000, '75.00', 'test.png', 100, 500)
      expect(event.savedBytes).toBe(150000)
    })

    it('should handle null compression count', () => {
      const event = createSuccessEvent(0, 100000, 60000, '40.00', 'test.png', null, 500)

      expect(event.compressionCount).toBe(null)
      expect(event.remaining).toBe(null)
    })

    it('should format compression ratio with percentage', () => {
      const event = createSuccessEvent(0, 100000, 60000, '40.00', 'test.png', 100, 500)
      expect(event.compressionRatio).toBe('40.00%')
    })

    it('should handle zero compression', () => {
      const event = createSuccessEvent(0, 100000, 100000, '0.00', 'test.png', 100, 500)
      expect(event.savedBytes).toBe(0)
      expect(event.compressionRatio).toBe('0.00%')
    })

    it('should handle real-world examples', () => {
      const event = createSuccessEvent(0, 23885, 7587, '68.24', 'coding.png', 57, 500)

      expect(event.originalSize).toBe(23885)
      expect(event.compressedSize).toBe(7587)
      expect(event.savedBytes).toBe(16298)
      expect(event.compressionRatio).toBe('68.24%')
      expect(event.remaining).toBe(443)
    })
  })

  describe('createErrorEvent()', () => {
    it('should create error event with all fields', () => {
      const error = new Error('Test error')
      const event = createErrorEvent('client', 0, 'Request failed', error, 400)

      expect(event).toEqual({
        type: 'client',
        keyIndex: 0,
        message: 'Request failed',
        error,
        status: 400,
      })
    })

    it('should handle error without status', () => {
      const error = new Error('Network error')
      const event = createErrorEvent('unknown', null, 'Network failed', error)

      expect(event).toEqual({
        type: 'unknown',
        keyIndex: null,
        message: 'Network failed',
        error,
      })
      expect(event.status).toBeUndefined()
    })

    it('should handle various error types', () => {
      const error = new Error('Test')
      expect(createErrorEvent('account', 0, 'msg', error).type).toBe('account')
      expect(createErrorEvent('client', 0, 'msg', error).type).toBe('client')
      expect(createErrorEvent('server', 0, 'msg', error).type).toBe('server')
      expect(createErrorEvent('unknown', 0, 'msg', error).type).toBe('unknown')
    })

    it('should handle null keyIndex', () => {
      const error = new Error('Test')
      const event = createErrorEvent('unknown', null, 'General error', error)
      expect(event.keyIndex).toBe(null)
    })

    it('should include HTTP status codes', () => {
      const error = new Error('Test')
      expect(createErrorEvent('account', 0, 'msg', error, 401).status).toBe(401)
      expect(createErrorEvent('account', 0, 'msg', error, 429).status).toBe(429)
      expect(createErrorEvent('client', 0, 'msg', error, 400).status).toBe(400)
      expect(createErrorEvent('server', 0, 'msg', error, 500).status).toBe(500)
    })
  })

  describe('createKeyErrorEvent()', () => {
    it('should create key error event', () => {
      const event = createKeyErrorEvent(0, 'API Key 无效')

      expect(event).toEqual({
        keyIndex: 0,
        error: 'API Key 无效',
      })
    })

    it('should handle various error messages', () => {
      expect(createKeyErrorEvent(0, 'Invalid key').error).toBe('Invalid key')
      expect(createKeyErrorEvent(1, 'Rate limited').error).toBe('Rate limited')
      expect(createKeyErrorEvent(2, 'Key expired').error).toBe('Key expired')
    })

    it('should handle multiple keys', () => {
      expect(createKeyErrorEvent(0, 'Error').keyIndex).toBe(0)
      expect(createKeyErrorEvent(1, 'Error').keyIndex).toBe(1)
      expect(createKeyErrorEvent(5, 'Error').keyIndex).toBe(5)
    })
  })

  describe('Event data consistency', () => {
    it('should always include keyIndex in key-related events', () => {
      expect(createCompressingEvent(0, 1, 3, 50, 500)).toHaveProperty('keyIndex')
      expect(createQuotaUpdateEvent(0, 100, 500)).toHaveProperty('keyIndex')
      expect(createSuccessEvent(0, 100, 60, '40', 'test.png', 100, 500)).toHaveProperty('keyIndex')
      expect(createKeyErrorEvent(0, 'Error')).toHaveProperty('keyIndex')
    })

    it('should include progress in progress events', () => {
      expect(createProgressEvent('uploading', 0.5, 'msg')).toHaveProperty('progress')
      expect(createProgressEvent('uploading', 0.5, 'msg').progress).toBeGreaterThanOrEqual(0)
      expect(createProgressEvent('uploading', 0.5, 'msg').progress).toBeLessThanOrEqual(1)
    })

    it('should include size information in relevant events', () => {
      expect(createStartEvent('file', 'test.png', 100)).toHaveProperty('size')
      expect(createSuccessEvent(0, 100, 60, '40', 'test.png', 100, 500)).toHaveProperty('originalSize')
      expect(createSuccessEvent(0, 100, 60, '40', 'test.png', 100, 500)).toHaveProperty('compressedSize')
    })
  })
})
