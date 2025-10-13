import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { sourceToBuffer } from './source-to-buffer.mjs'

const TEST_DIR = 'test/source-to-buffer-test'
const TEST_FILE = `${TEST_DIR}/test.txt`
const TEST_IMAGE = 'test/coding.png'

describe('source-to-buffer - sourceToBuffer()', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true })
    await writeFile(TEST_FILE, 'Hello, World!')
  })

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('File Path Input', () => {
    it('should convert file path to buffer', async () => {
      const result = await sourceToBuffer(TEST_FILE)

      expect(result).toHaveProperty('buffer')
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('size')
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
    })

    it('should return correct type for file path', async () => {
      const result = await sourceToBuffer(TEST_FILE)
      expect(result.type).toBe('file')
    })

    it('should extract filename from file path', async () => {
      const result = await sourceToBuffer(TEST_FILE)
      expect(result.filename).toBe('test.txt')
    })

    it('should get correct file size', async () => {
      const result = await sourceToBuffer(TEST_FILE)
      expect(result.size).toBe(13) // "Hello, World!" is 13 bytes
    })

    it('should read file content correctly', async () => {
      const result = await sourceToBuffer(TEST_FILE)
      expect(result.buffer.toString()).toBe('Hello, World!')
    })

    it('should handle binary files', async () => {
      const result = await sourceToBuffer(TEST_IMAGE)
      expect(result.type).toBe('file')
      expect(result.filename).toBe('coding.png')
      expect(result.size).toBeGreaterThan(0)
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
    })
  })

  describe('Stream Input', () => {
    it('should convert readable stream to buffer', async () => {
      const stream = createReadStream(TEST_FILE)
      const result = await sourceToBuffer(stream)

      expect(result).toHaveProperty('buffer')
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('size')
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
    })

    it('should return correct type for stream', async () => {
      const stream = createReadStream(TEST_FILE)
      const result = await sourceToBuffer(stream)
      expect(result.type).toBe('stream')
    })

    it('should extract filename from stream path', async () => {
      const stream = createReadStream(TEST_FILE)
      const result = await sourceToBuffer(stream)
      expect(result.filename).toBe('test.txt')
    })

    it('should read stream content correctly', async () => {
      const stream = createReadStream(TEST_FILE)
      const result = await sourceToBuffer(stream)
      expect(result.buffer.toString()).toBe('Hello, World!')
    })

    it('should handle stream without path', async () => {
      const stream = Readable.from([Buffer.from('test data')])
      const result = await sourceToBuffer(stream)

      expect(result.type).toBe('stream')
      expect(result.buffer.toString()).toBe('test data')
      expect(result.filename).toBeUndefined()
    })

    it('should handle binary stream', async () => {
      const stream = createReadStream(TEST_IMAGE)
      const result = await sourceToBuffer(stream)

      expect(result.type).toBe('stream')
      expect(result.filename).toBe('coding.png')
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
      expect(result.buffer.length).toBeGreaterThan(0)
    })
  })

  describe('Buffer Input', () => {
    it('should handle buffer input', async () => {
      const buffer = Buffer.from('Hello, Buffer!')
      const result = await sourceToBuffer(buffer)

      expect(result).toHaveProperty('buffer')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('size')
      expect(result.buffer).toBe(buffer)
    })

    it('should return correct type for buffer', async () => {
      const buffer = Buffer.from('test')
      const result = await sourceToBuffer(buffer)
      expect(result.type).toBe('buffer')
    })

    it('should not have filename for buffer', async () => {
      const buffer = Buffer.from('test')
      const result = await sourceToBuffer(buffer)
      expect(result.filename).toBeUndefined()
    })

    it('should return correct size for buffer', async () => {
      const buffer = Buffer.from('Hello, Buffer!')
      const result = await sourceToBuffer(buffer)
      expect(result.size).toBe(14)
    })

    it('should preserve buffer content', async () => {
      const buffer = Buffer.from('Hello, Buffer!')
      const result = await sourceToBuffer(buffer)
      expect(result.buffer.toString()).toBe('Hello, Buffer!')
    })

    it('should handle empty buffer', async () => {
      const buffer = Buffer.alloc(0)
      const result = await sourceToBuffer(buffer)

      expect(result.type).toBe('buffer')
      expect(result.buffer.length).toBe(0)
      expect(result.size).toBe(0)
    })

    it('should handle large buffer', async () => {
      const buffer = Buffer.alloc(10000, 'x')
      const result = await sourceToBuffer(buffer)

      expect(result.type).toBe('buffer')
      expect(result.buffer.length).toBe(10000)
      expect(result.size).toBe(10000)
    })

    it('should handle binary buffer', async () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff])
      const result = await sourceToBuffer(buffer)

      expect(result.type).toBe('buffer')
      expect(result.buffer).toEqual(buffer)
      expect(result.size).toBe(4)
    })
  })

  describe('Error Handling', () => {
    it('should throw TypeError for invalid input', async () => {
      await expect(sourceToBuffer(null)).rejects.toThrow(TypeError)
      await expect(sourceToBuffer(undefined)).rejects.toThrow(TypeError)
      await expect(sourceToBuffer(123)).rejects.toThrow(TypeError)
      await expect(sourceToBuffer({})).rejects.toThrow(TypeError)
      await expect(sourceToBuffer([])).rejects.toThrow(TypeError)
    })

    it('should throw with correct error message', async () => {
      await expect(sourceToBuffer(null)).rejects.toThrow('只支持文件路径、Buffer 或 Stream 实例')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty file', async () => {
      const emptyFile = `${TEST_DIR}/empty.txt`
      await writeFile(emptyFile, '')

      const result = await sourceToBuffer(emptyFile)

      expect(result.type).toBe('file')
      expect(result.buffer.length).toBe(0)
      expect(result.size).toBe(0)
    })

    it('should handle file with special characters in name', async () => {
      const specialFile = `${TEST_DIR}/test file-123_测试.txt`
      await writeFile(specialFile, 'special')

      const result = await sourceToBuffer(specialFile)

      expect(result.type).toBe('file')
      expect(result.filename).toBe('test file-123_测试.txt')
      expect(result.buffer.toString()).toBe('special')
    })

    it('should handle empty stream', async () => {
      const stream = Readable.from([])
      const result = await sourceToBuffer(stream)

      expect(result.type).toBe('stream')
      expect(result.buffer.length).toBe(0)
    })

    it('should handle stream with single chunk', async () => {
      const stream = Readable.from([Buffer.from('single')])
      const result = await sourceToBuffer(stream)

      expect(result.type).toBe('stream')
      expect(result.buffer.toString()).toBe('single')
    })

    it('should handle stream with multiple chunks', async () => {
      const stream = Readable.from([
        Buffer.from('Hello'),
        Buffer.from(', '),
        Buffer.from('World'),
        Buffer.from('!'),
      ])
      const result = await sourceToBuffer(stream)

      expect(result.type).toBe('stream')
      expect(result.buffer.toString()).toBe('Hello, World!')
    })

    it('should handle stream with large chunks', async () => {
      const largeChunk = Buffer.alloc(10000, 'x')
      const stream = Readable.from([largeChunk])
      const result = await sourceToBuffer(stream)

      expect(result.type).toBe('stream')
      expect(result.buffer.length).toBe(10000)
    })
  })

  describe('Data Integrity', () => {
    it('should preserve binary data from file', async () => {
      const binaryFile = `${TEST_DIR}/binary.bin`
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      await writeFile(binaryFile, binaryData)

      const result = await sourceToBuffer(binaryFile)

      expect(result.buffer).toEqual(binaryData)
    })

    it('should preserve binary data from stream', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const stream = Readable.from([binaryData])

      const result = await sourceToBuffer(stream)

      expect(result.buffer).toEqual(binaryData)
    })

    it('should preserve binary data from buffer', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])

      const result = await sourceToBuffer(binaryData)

      expect(result.buffer).toEqual(binaryData)
    })

    it('should handle UTF-8 text correctly', async () => {
      const utf8Text = '你好，世界！ 🌍'
      const utf8File = `${TEST_DIR}/utf8.txt`
      await writeFile(utf8File, utf8Text, 'utf8')

      const result = await sourceToBuffer(utf8File)

      expect(result.buffer.toString('utf8')).toBe(utf8Text)
    })
  })

  describe('Return Value Structure', () => {
    it('should have consistent structure for file', async () => {
      const result = await sourceToBuffer(TEST_FILE)

      expect(result).toMatchObject({
        buffer: expect.any(Buffer),
        filename: expect.any(String),
        type: 'file',
        size: expect.any(Number),
      })
    })

    it('should have consistent structure for stream', async () => {
      const stream = createReadStream(TEST_FILE)
      const result = await sourceToBuffer(stream)

      expect(result).toMatchObject({
        buffer: expect.any(Buffer),
        type: 'stream',
      })
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('size')
    })

    it('should have consistent structure for buffer', async () => {
      const buffer = Buffer.from('test')
      const result = await sourceToBuffer(buffer)

      expect(result).toMatchObject({
        buffer: expect.any(Buffer),
        type: 'buffer',
        size: expect.any(Number),
      })
      expect(result.filename).toBeUndefined()
    })
  })
})
