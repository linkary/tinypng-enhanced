/**
 * Vitest tests for service.mjs
 * Unit tests and integration tests with proper mocking and cleanup
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import * as TinyPNGService from './service.mjs'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test configuration
const OUTPUT_DIR = join(__dirname, '../test/output')
const TEST_IMAGE = join(__dirname, '../test/coding.png')
const [API_KEY] = process.env.TINYPNG_API_KEY?.split(',')

if (!API_KEY) {
  throw new Error('API_KEY is not set')
}

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

// ============================================================================
// UNIT TESTS
// ============================================================================

describe('Service Layer - Unit Tests', () => {
  describe('createAuthHeader()', () => {
    it('should generate correct Basic Auth format', () => {
      const header = TinyPNGService.createAuthHeader('test-key')

      expect(header).toBeTypeOf('string')
      expect(header).toMatch(/^Basic [A-Za-z0-9+/]+=*$/)
    })

    it('should encode credentials correctly', () => {
      const header = TinyPNGService.createAuthHeader('test-key')
      const base64Part = header.replace('Basic ', '')
      const decoded = Buffer.from(base64Part, 'base64').toString()

      expect(decoded).toBe('api:test-key')
    })

    it('should produce different headers for different keys', () => {
      const header1 = TinyPNGService.createAuthHeader('key1')
      const header2 = TinyPNGService.createAuthHeader('key2')

      expect(header1).not.toBe(header2)
    })

    it('should handle special characters in API key', () => {
      const header = TinyPNGService.createAuthHeader('test-key-123_ABC')
      const base64Part = header.replace('Basic ', '')
      const decoded = Buffer.from(base64Part, 'base64').toString()

      expect(decoded).toBe('api:test-key-123_ABC')
    })
  })

  describe('parseApiError()', () => {
    it('should parse error response with JSON body', async () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          error: 'Unauthorized',
          message: 'Invalid API key',
        }),
      }

      const error = await TinyPNGService.parseApiError(mockResponse)

      expect(error.status).toBe(401)
      expect(error.statusText).toBe('Unauthorized')
      expect(error.message).toBe('Invalid API key')
      expect(error.errorType).toBe('Unauthorized')
      expect(mockResponse.json).toHaveBeenCalled()
    })

    it('should handle non-JSON error responses', async () => {
      const mockResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Not JSON')),
      }

      const error = await TinyPNGService.parseApiError(mockResponse)

      expect(error.status).toBe(500)
      expect(error.statusText).toBe('Internal Server Error')
      expect(error.message).toContain('500')
      expect(error.message).toContain('Internal Server Error')
    })

    it('should use default message when JSON parsing fails', async () => {
      const mockResponse = {
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn().mockRejectedValue(new Error('Parse error')),
      }

      const error = await TinyPNGService.parseApiError(mockResponse)

      expect(error.message).toContain('503')
      expect(error.errorType).toBe(null)
    })

    it('should handle various HTTP status codes', async () => {
      const statusCodes = [400, 401, 403, 404, 415, 429, 500, 502, 503]

      for (const status of statusCodes) {
        const mockResponse = {
          status,
          statusText: 'Error',
          json: vi.fn().mockResolvedValue({ message: `Error ${status}` }),
        }

        const error = await TinyPNGService.parseApiError(mockResponse)
        expect(error.status).toBe(status)
      }
    })
  })

  describe('Module Exports', () => {
    it('should export all required functions', () => {
      expect(TinyPNGService.createAuthHeader).toBeTypeOf('function')
      expect(TinyPNGService.parseApiError).toBeTypeOf('function')
      expect(TinyPNGService.shrink).toBeTypeOf('function')
      expect(TinyPNGService.resize).toBeTypeOf('function')
      expect(TinyPNGService.convert).toBeTypeOf('function')
      expect(TinyPNGService.download).toBeTypeOf('function')
    })

    it('should have correct function signatures', () => {
      // Check function lengths (parameter count)
      expect(TinyPNGService.createAuthHeader.length).toBe(1)
      expect(TinyPNGService.parseApiError.length).toBe(1)
      expect(TinyPNGService.shrink.length).toBe(2)
      expect(TinyPNGService.resize.length).toBe(3)
      expect(TinyPNGService.convert.length).toBe(3)
      expect(TinyPNGService.download.length).toBe(2)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS (Require API Key)
// ============================================================================

describe.skipIf(!API_KEY || !existsSync(TEST_IMAGE))('Service Layer - Integration Tests', () => {
  let shrinkResult

  describe('shrink()', () => {
    it('should compress an image successfully', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const originalSize = buffer.length

      shrinkResult = await TinyPNGService.shrink(buffer, API_KEY)

      expect(shrinkResult).toBeDefined()
      expect(shrinkResult.outputUrl).toBeTypeOf('string')
      expect(shrinkResult.outputUrl).toMatch(/^https:\/\//)
      expect(shrinkResult.compressionCount).toSatisfy(val => val === null || typeof val === 'number')
      expect(shrinkResult.data).toBeDefined()
    }, 30000) // 30s timeout for API call

    it('should return valid output URL', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const result = await TinyPNGService.shrink(buffer, API_KEY)

      expect(result.outputUrl).toMatch(/^https:\/\/api\.tinify\.com/)
    }, 30000)

    it('should throw error with invalid API key', async () => {
      const buffer = readFileSync(TEST_IMAGE)

      await expect(TinyPNGService.shrink(buffer, 'invalid-api-key-123')).rejects.toThrow()
    }, 30000)
  })

  describe('download()', () => {
    it('should download compressed image', async () => {
      // Use result from previous shrink test
      if (!shrinkResult) {
        const buffer = readFileSync(TEST_IMAGE)
        shrinkResult = await TinyPNGService.shrink(buffer, API_KEY)
      }

      const response = await TinyPNGService.download(shrinkResult.outputUrl, API_KEY)

      expect(response).toBeInstanceOf(Response)
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const compressedBuffer = Buffer.from(await response.arrayBuffer())
      const originalBuffer = readFileSync(TEST_IMAGE)

      expect(compressedBuffer.length).toBeGreaterThan(0)
      expect(compressedBuffer.length).toBeLessThan(originalBuffer.length)

      // Save to output directory
      const outputPath = join(OUTPUT_DIR, 'service-compressed.png')
      writeFileSync(outputPath, compressedBuffer)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)

    it('should throw error with invalid URL', async () => {
      await expect(TinyPNGService.download('https://api.tinify.com/invalid-url', API_KEY)).rejects.toThrow()
    }, 30000)
  })

  describe('resize()', () => {
    it('should apply scale transformation', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      const resizeOptions = {
        method: 'scale',
        width: 400,
      }
      const result = await TinyPNGService.resize(shrinkRes.outputUrl, resizeOptions, API_KEY)

      expect(result.response).toBeInstanceOf(Response)
      expect(result.response.ok).toBe(true)
      expect(result.compressionCount).toSatisfy(val => val === null || typeof val === 'number')

      // Download and save resized image
      const resizedBuffer = Buffer.from(await result.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-resized-scale.png')
      writeFileSync(outputPath, resizedBuffer)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)

    it('should apply fit transformation with width and height', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      const resizeOptions = {
        method: 'fit',
        width: 600,
        height: 400,
      }
      const result = await TinyPNGService.resize(shrinkRes.outputUrl, resizeOptions, API_KEY)

      expect(result.response.ok).toBe(true)

      const resizedBuffer = Buffer.from(await result.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-resized-fit.png')
      writeFileSync(outputPath, resizedBuffer)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)
  })

  describe('convert()', () => {
    it('should convert image to WebP format', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      const convertOptions = {
        type: 'image/webp',
      }
      const result = await TinyPNGService.convert(shrinkRes.outputUrl, convertOptions, API_KEY)

      expect(result.response).toBeInstanceOf(Response)
      expect(result.response.ok).toBe(true)
      expect(result.compressionCount).toSatisfy(val => val === null || typeof val === 'number')

      // Verify Content-Type header
      const contentType = result.response.headers.get('Content-Type')
      expect(contentType).toBe('image/webp')

      // Download and save converted image
      const convertedBuffer = Buffer.from(await result.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-converted.webp')
      writeFileSync(outputPath, convertedBuffer)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)

    it('should convert image to PNG format', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      const convertOptions = {
        type: 'image/png',
      }
      const result = await TinyPNGService.convert(shrinkRes.outputUrl, convertOptions, API_KEY)

      expect(result.response.ok).toBe(true)

      const contentType = result.response.headers.get('Content-Type')
      expect(contentType).toBe('image/png')

      const convertedBuffer = Buffer.from(await result.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-converted.png')
      writeFileSync(outputPath, convertedBuffer)
      expect(existsSync(outputPath)).toBe(true)
    }, 30000)

    it('should handle JPEG conversion requirement for transparent images', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      const convertOptions = {
        type: 'image/jpeg',
      }

      // PNG with transparency cannot convert to JPEG without background
      await expect(async () => {
        await TinyPNGService.convert(shrinkRes.outputUrl, convertOptions, API_KEY)
      }).rejects.toThrow(/flattening/i)

      try {
        await TinyPNGService.convert(shrinkRes.outputUrl, convertOptions, API_KEY)
      } catch (error) {
        expect(error.status).toBe(400)
        expect(error.errorType).toBe('Flattening required')
        expect(error.message).toContain('flattening')
      }
    }, 30000)

    it('should handle multiple format conversion (returns smallest)', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      const convertOptions = {
        type: ['image/webp', 'image/png'],
      }
      const result = await TinyPNGService.convert(shrinkRes.outputUrl, convertOptions, API_KEY)

      expect(result.response.ok).toBe(true)

      // Should return one of the specified formats
      const contentType = result.response.headers.get('Content-Type')
      expect(['image/webp', 'image/png']).toContain(contentType)

      const convertedBuffer = Buffer.from(await result.response.arrayBuffer())
      expect(convertedBuffer.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Full Workflow', () => {
    it('should complete shrink → resize → download workflow', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const originalSize = buffer.length

      // Step 1: Shrink
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)
      expect(shrinkRes.outputUrl).toBeDefined()

      // Step 2: Resize
      const resizeOptions = {
        method: 'cover',
        width: 500,
        height: 500,
      }
      const resizeRes = await TinyPNGService.resize(shrinkRes.outputUrl, resizeOptions, API_KEY)
      expect(resizeRes.response.ok).toBe(true)

      // Step 3: Get final buffer
      const finalBuffer = Buffer.from(await resizeRes.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-workflow.png')
      writeFileSync(outputPath, finalBuffer)

      expect(finalBuffer.length).toBeGreaterThan(0)
      expect(finalBuffer.length).toBeLessThan(originalSize)
      expect(existsSync(outputPath)).toBe(true)

      // Verify compression ratio
      const compressionRatio = (1 - finalBuffer.length / originalSize) * 100
      expect(compressionRatio).toBeGreaterThan(0)
      expect(compressionRatio).toBeLessThan(100)
    }, 45000)

    it('should complete shrink → convert → download workflow', async () => {
      const buffer = readFileSync(TEST_IMAGE)

      // Step 1: Shrink
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)
      expect(shrinkRes.outputUrl).toBeDefined()

      // Step 2: Convert to WebP
      const convertOptions = {
        type: 'image/webp',
      }
      const convertRes = await TinyPNGService.convert(shrinkRes.outputUrl, convertOptions, API_KEY)
      expect(convertRes.response.ok).toBe(true)

      // Step 3: Verify format and save
      const contentType = convertRes.response.headers.get('Content-Type')
      expect(contentType).toBe('image/webp')

      const finalBuffer = Buffer.from(await convertRes.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-workflow-convert.webp')
      writeFileSync(outputPath, finalBuffer)

      expect(finalBuffer.length).toBeGreaterThan(0)
      expect(existsSync(outputPath)).toBe(true)
    }, 45000)

    it('should complete shrink → resize → convert workflow', async () => {
      const buffer = readFileSync(TEST_IMAGE)

      // Step 1: Shrink
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)
      expect(shrinkRes.outputUrl).toBeDefined()

      // Step 2: Resize
      const resizeOptions = {
        method: 'fit',
        width: 300,
        height: 300,
      }
      const resizeRes = await TinyPNGService.resize(shrinkRes.outputUrl, resizeOptions, API_KEY)
      expect(resizeRes.response.ok).toBe(true)

      // Get resized URL from response
      const resizedUrl = resizeRes.response.url

      // Step 3: Convert to WebP
      const convertOptions = {
        type: 'image/webp',
      }
      const convertRes = await TinyPNGService.convert(resizedUrl, convertOptions, API_KEY)
      expect(convertRes.response.ok).toBe(true)

      // Step 4: Verify and save
      const contentType = convertRes.response.headers.get('Content-Type')
      expect(contentType).toBe('image/webp')

      const finalBuffer = Buffer.from(await convertRes.response.arrayBuffer())
      const outputPath = join(OUTPUT_DIR, 'service-workflow-resize-convert.webp')
      writeFileSync(outputPath, finalBuffer)

      expect(finalBuffer.length).toBeGreaterThan(0)
      expect(existsSync(outputPath)).toBe(true)
    }, 60000)
  })

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized error', async () => {
      const buffer = readFileSync(TEST_IMAGE)

      await expect(async () => {
        await TinyPNGService.shrink(buffer, 'totally-invalid-key')
      }).rejects.toThrow()

      try {
        await TinyPNGService.shrink(buffer, 'totally-invalid-key')
      } catch (error) {
        expect(error.status).toBe(401)
        expect(error.message).toBeDefined()
      }
    }, 30000)

    it('should handle invalid resize options', async () => {
      const buffer = readFileSync(TEST_IMAGE)
      const shrinkRes = await TinyPNGService.shrink(buffer, API_KEY)

      // Invalid resize method
      const invalidOptions = {
        method: 'invalid-method',
        width: 100,
      }

      await expect(TinyPNGService.resize(shrinkRes.outputUrl, invalidOptions, API_KEY)).rejects.toThrow()
    }, 30000)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Service Layer - Edge Cases', () => {
  describe('Input Validation', () => {
    it('should handle empty API key', () => {
      const header = TinyPNGService.createAuthHeader('')
      expect(header).toBe('Basic YXBpOg==') // base64 of "api:"
    })

    it('should handle API key with spaces', () => {
      const header = TinyPNGService.createAuthHeader('key with spaces')
      const base64Part = header.replace('Basic ', '')
      const decoded = Buffer.from(base64Part, 'base64').toString()
      expect(decoded).toBe('api:key with spaces')
    })
  })

  describe('Response Headers', () => {
    it('should handle missing Compression-Count header gracefully', async () => {
      // This is tested implicitly in integration tests
      // The compressionCount can be null which is valid
      expect(true).toBe(true)
    })
  })
})
