/**
 * Vitest tests for multipart.mjs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generateBoundary, createMultipartStream } from './multipart.mjs'
import { Readable, Transform } from 'node:stream'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test directory
const TEST_DIR = join(__dirname, '../../test/utils-test')
const TEST_FILE = join(TEST_DIR, 'multipart-test.txt')
const TEST_CONTENT = 'Test multipart content'

// Setup and cleanup
beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true })
  }
  writeFileSync(TEST_FILE, TEST_CONTENT)
})

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
})

describe('multipart - generateBoundary()', () => {
  it('should generate a boundary string', () => {
    const boundary = generateBoundary()
    expect(boundary).toBeDefined()
    expect(typeof boundary).toBe('string')
  })

  it('should start with correct prefix', () => {
    const boundary = generateBoundary()
    expect(boundary).toMatch(/^----WebKitFormBoundary/)
  })

  it('should generate unique boundaries', () => {
    const boundary1 = generateBoundary()
    const boundary2 = generateBoundary()
    expect(boundary1).not.toBe(boundary2)
  })

  it('should generate boundaries of consistent length', () => {
    const boundary1 = generateBoundary()
    const boundary2 = generateBoundary()
    expect(boundary1.length).toBe(boundary2.length)
  })

  it('should contain hex characters after prefix', () => {
    const boundary = generateBoundary()
    const hexPart = boundary.replace('----WebKitFormBoundary', '')
    expect(hexPart).toMatch(/^[0-9a-f]+$/)
  })

  it('should generate 32 hex characters (16 bytes)', () => {
    const boundary = generateBoundary()
    const hexPart = boundary.replace('----WebKitFormBoundary', '')
    expect(hexPart.length).toBe(32) // 16 bytes * 2 hex chars per byte
  })
})

describe('multipart - createMultipartStream()', () => {
  describe('Basic Functionality', () => {
    it('should create multipart stream from readable stream', async () => {
      const fileStream = Readable.from([TEST_CONTENT])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)

      expect(result).toBeDefined()
      expect(result.stream).toBeInstanceOf(Readable)
      expect(result.boundary).toBe(boundary)
      expect(result.contentLength).toBeTypeOf('number')
    })

    it('should return correct boundary', async () => {
      const fileStream = Readable.from([TEST_CONTENT])
      const boundary = '----TestBoundary123'
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      expect(result.boundary).toBe(boundary)
    })

    it('should calculate content length correctly', async () => {
      const fileStream = Readable.from([TEST_CONTENT])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)

      // Content length should be header + footer length
      expect(result.contentLength).toBeGreaterThan(0)
      expect(result.contentLength).toBeTypeOf('number')
    })
  })

  describe('Stream Content', () => {
    it('should include file header in stream', async () => {
      const fileStream = Readable.from([Buffer.from(TEST_CONTENT)])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()
      expect(content).toContain(`--${boundary}`)
      expect(content).toContain(`Content-Disposition: form-data; name="file"; filename="${filename}"`)
      expect(content).toContain('Content-Type: application/octet-stream')
    })

    it('should include file content in stream', async () => {
      const fileStream = Readable.from([Buffer.from(TEST_CONTENT)])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()
      expect(content).toContain(TEST_CONTENT)
    })

    it('should include closing boundary in stream', async () => {
      const fileStream = Readable.from([Buffer.from(TEST_CONTENT)])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()
      expect(content).toContain(`--${boundary}--`)
    })

    it('should have correct multipart format', async () => {
      const fileStream = Readable.from([Buffer.from('Hello'), Buffer.from('World')])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()

      // Check format: boundary, headers, content, closing boundary
      expect(content).toMatch(new RegExp(`^--${boundary}\r\n`))
      expect(content).toMatch(/\r\n\r\n/) // Header-content separator
      expect(content).toMatch(new RegExp(`\r\n--${boundary}--\r\n$`))
    })
  })

  describe('With Progress Tracker', () => {
    it('should work with progress tracker', async () => {
      const fileStream = Readable.from([TEST_CONTENT])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const progressTracker = new Transform({
        transform(chunk, encoding, callback) {
          callback(null, chunk)
        },
      })

      const result = await createMultipartStream(fileStream, filename, boundary, progressTracker)

      expect(result.stream).toBeInstanceOf(Readable)

      // Consume stream to ensure it works
      const chunks = []
      for await (const chunk of result.stream) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should pass file data through progress tracker', async () => {
      const fileStream = Readable.from(['chunk1', 'chunk2', 'chunk3'])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      let trackerCallCount = 0
      const progressTracker = new Transform({
        transform(chunk, encoding, callback) {
          trackerCallCount++
          callback(null, chunk)
        },
      })

      const result = await createMultipartStream(fileStream, filename, boundary, progressTracker)

      // Consume stream
      for await (const chunk of result.stream) {
        // Just consume
      }

      expect(trackerCallCount).toBe(3) // Should track all 3 chunks
    })
  })

  describe('Different File Types', () => {
    it('should handle binary data', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff])
      const fileStream = Readable.from([binaryData])
      const boundary = generateBoundary()
      const filename = 'binary.dat'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks)
      // Check that binary data is included somewhere in the content
      expect(content.includes(binaryData)).toBe(true)
    })

    it('should handle empty file', async () => {
      const fileStream = Readable.from([])
      const boundary = generateBoundary()
      const filename = 'empty.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      expect(chunks.length).toBeGreaterThan(0) // Should have at least headers
    })

    it('should handle large chunks', async () => {
      const largeData = 'X'.repeat(10000)
      const fileStream = Readable.from([Buffer.from(largeData)])
      const boundary = generateBoundary()
      const filename = 'large.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()
      expect(content).toContain(largeData)
    })

    it('should handle special characters in filename', async () => {
      const fileStream = Readable.from([Buffer.from(TEST_CONTENT)])
      const boundary = generateBoundary()
      const filename = 'test file-123_测试.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()
      expect(content).toContain(filename)
    })
  })

  describe('Stream Behavior', () => {
    it('should create stream that can be consumed once', async () => {
      const fileStream = Readable.from([TEST_CONTENT])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)

      // First consumption
      const chunks1 = []
      for await (const chunk of result.stream) {
        chunks1.push(chunk)
      }

      expect(chunks1.length).toBeGreaterThan(0)

      // Second consumption should not work (stream already consumed)
      const chunks2 = []
      for await (const chunk of result.stream) {
        chunks2.push(chunk)
      }

      expect(chunks2.length).toBe(0)
    })

    it('should yield chunks in correct order', async () => {
      const fileStream = Readable.from([Buffer.from('A'), Buffer.from('B'), Buffer.from('C')])
      const boundary = generateBoundary()
      const filename = 'test.txt'

      const result = await createMultipartStream(fileStream, filename, boundary)
      const chunks = []

      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString()

      // Find positions
      const headerPos = content.indexOf('Content-Type')
      const contentStartPos = content.indexOf('ABC')
      const footerPos = content.lastIndexOf('--' + boundary)

      expect(headerPos).toBeLessThan(contentStartPos)
      expect(contentStartPos).toBeLessThan(footerPos)
    })
  })
})
