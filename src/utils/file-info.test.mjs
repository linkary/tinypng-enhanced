/**
 * Vitest tests for file-info.mjs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getFileInfo } from './file-info.mjs'
import { createReadStream, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { Readable } from 'node:stream'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test files
const TEST_DIR = join(__dirname, '../../test/utils-test')
const TEST_FILE = join(TEST_DIR, 'test-file.txt')
const TEST_CONTENT = 'Hello, TinyPNG!'

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

describe('file-info - getFileInfo()', () => {
  describe('File Path Input', () => {
    it('should get file info from file path', () => {
      const info = getFileInfo(TEST_FILE)

      expect(info).toBeDefined()
      expect(info.stream).toBeInstanceOf(Readable)
      expect(info.filename).toBe('test-file.txt')
      expect(info.totalSize).toBe(TEST_CONTENT.length)

      // Close stream to prevent unhandled errors
      info.stream.on('error', () => {})
      info.stream.destroy()
    })

    it('should extract filename from path', () => {
      const info = getFileInfo(TEST_FILE)
      expect(info.filename).toBe('test-file.txt')

      // Close stream to prevent unhandled errors
      info.stream.on('error', () => {})
      info.stream.destroy()
    })

    it('should get correct file size', () => {
      const info = getFileInfo(TEST_FILE)
      expect(info.totalSize).toBe(TEST_CONTENT.length)

      // Close stream to prevent unhandled errors
      info.stream.on('error', () => {})
      info.stream.destroy()
    })

    it('should create readable stream from file', async () => {
      const info = getFileInfo(TEST_FILE)
      const chunks = []

      for await (const chunk of info.stream) {
        chunks.push(chunk)
      }

      const content = Buffer.concat(chunks).toString()
      expect(content).toBe(TEST_CONTENT)
    })

    it('should handle non-existent file gracefully', async () => {
      const info = getFileInfo(join(TEST_DIR, 'non-existent.txt'))

      expect(info.stream).toBeInstanceOf(Readable)
      expect(info.filename).toBe('non-existent.txt')
      expect(info.totalSize).toBeNaN()

      // Clean up stream to prevent unhandled errors
      info.stream.on('error', () => {
        // Expected error for non-existent file
      })
      info.stream.destroy()
    })
  })

  describe('Stream Input', () => {
    it('should get file info from readable stream', () => {
      const stream = createReadStream(TEST_FILE)
      stream.on('error', () => {}) // Prevent unhandled errors
      const info = getFileInfo(stream)

      expect(info).toBeDefined()
      expect(info.stream).toBeInstanceOf(Readable)
      expect(info.stream).toBe(stream)

      // Close stream
      stream.destroy()
    })

    it('should extract filename from stream path', () => {
      const stream = createReadStream(TEST_FILE)
      stream.on('error', () => {}) // Prevent unhandled errors
      const info = getFileInfo(stream)

      expect(info.filename).toBe('test-file.txt')

      // Close stream
      stream.destroy()
    })

    it('should get file size from stream path', () => {
      const stream = createReadStream(TEST_FILE)
      stream.on('error', () => {}) // Prevent unhandled errors
      const info = getFileInfo(stream)

      expect(info.totalSize).toBe(TEST_CONTENT.length)

      // Close stream
      stream.destroy()
    })

    it('should handle stream without path', () => {
      const stream = Readable.from(['test', 'data'])
      const info = getFileInfo(stream)

      expect(info.stream).toBe(stream)
      expect(info.filename).toBeUndefined()
      expect(info.totalSize).toBeNaN()

      // Close stream
      stream.destroy()
    })

    it('should handle stream with invalid path', async () => {
      const stream = createReadStream(TEST_FILE)
      stream.on('error', () => {}) // Prevent unhandled errors
      stream.path = '/invalid/path/file.txt'
      const info = getFileInfo(stream)

      expect(info.stream).toBe(stream)
      expect(info.filename).toBe('file.txt')
      expect(info.totalSize).toBeNaN()

      // Clean up stream
      stream.destroy()
    })
  })

  describe('Error Handling', () => {
    it('should throw TypeError for invalid input', () => {
      expect(() => getFileInfo(null)).toThrow(TypeError)
      expect(() => getFileInfo(undefined)).toThrow(TypeError)
      expect(() => getFileInfo(123)).toThrow(TypeError)
      expect(() => getFileInfo({})).toThrow(TypeError)
      expect(() => getFileInfo([])).toThrow(TypeError)
    })

    it('should throw with correct error message', () => {
      expect(() => getFileInfo(null)).toThrow('只支持传入文件路径或Stream实例')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty file', () => {
      const emptyFile = join(TEST_DIR, 'empty.txt')
      writeFileSync(emptyFile, '')

      const info = getFileInfo(emptyFile)
      expect(info.totalSize).toBe(0)

      // Close stream to prevent unhandled errors
      info.stream.on('error', () => {})
      info.stream.destroy()
    })

    it('should handle file with special characters in name', () => {
      const specialFile = join(TEST_DIR, 'test file-123_测试.txt')
      writeFileSync(specialFile, 'content')

      const info = getFileInfo(specialFile)
      expect(info.filename).toBe('test file-123_测试.txt')

      // Close stream to prevent unhandled errors
      info.stream.on('error', () => {})
      info.stream.destroy()
    })

    it('should handle relative paths', () => {
      const info = getFileInfo('./test/coding.png')
      expect(info.stream).toBeInstanceOf(Readable)
      expect(info.filename).toBe('coding.png')

      // Close stream to prevent unhandled errors
      info.stream.on('error', () => {})
      info.stream.destroy()
    })
  })
})
