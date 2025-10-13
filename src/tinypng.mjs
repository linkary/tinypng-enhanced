import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { sourceToBuffer } from './utils/source-to-buffer.mjs'
import { KeyManager } from './key-manager.mjs'
import * as TinyPNGService from './service.mjs'

/**
 * TinyPNG Compressor with multiple API key support
 * Automatically rotates between API keys to handle rate limits
 * Uses native fetch API without external dependencies
 */
export default class TinyPNGCompressor extends EventEmitter {
  /**
   * @param {Object} options - Configuration options
   * @param {string|string[]} options.apiKey - Single API key or array of API keys
   * @param {number} [options.compressionCount=500] - Compressions per key per month
   */
  constructor(options) {
    super()

    // Normalize to array of API keys
    const apiKeys = Array.isArray(options.apiKey) ? options.apiKey : [options.apiKey]

    // Initialize key manager with smart selection and accurate tracking
    this.keyManager = new KeyManager({
      apiKeys,
      monthlyLimit: options.compressionCount || 500,
    })

    this.emit('init', {
      totalKeys: this.keyManager.getTotalKeys(),
      keysConfigured: apiKeys.map((_, i) => `Key ${i + 1}`),
    })
  }

  /**
   * Compress a file or buffer using TinyPNG API
   * @param {string|Buffer|Readable} source - File path, buffer, or readable stream
   * @param {Object} [options] - Compression options
   * @param {Object} [options.resize] - Resize options
   * @param {string} [options.resize.method] - Resize method (scale, fit, cover, thumb)
   * @param {number} [options.resize.width] - Target width
   * @param {number} [options.resize.height] - Target height
   * @returns {Promise<Buffer>} Compressed image buffer
   * @see https://tinypng.com/developers/reference#request-options
   */
  async compress(source, options = {}) {
    // Convert source to buffer
    const { buffer, filename, type, size } = await sourceToBuffer(source)

    // Emit start event with source metadata
    this.emit('start', {
      type,
      filename,
      size,
    })

    const originalSize = buffer.length

    // Try compression with key rotation
    let lastError
    const maxRetries = this.keyManager.getTotalKeys()

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let keyStat

      try {
        // Select best available key (least-used strategy)
        keyStat = this.keyManager.selectBestKey()

        this.emit('compressing', {
          keyIndex: keyStat.index,
          attempt: attempt + 1,
          maxRetries,
          compressionCount: keyStat.compressionCount,
          remaining:
            keyStat.compressionCount === null ? 'unknown' : keyStat.monthlyLimit - keyStat.compressionCount,
        })

        // Step 1: Upload and compress image
        const shrinkResult = await TinyPNGService.shrink(buffer, keyStat.key)

        // Update compression count from API response
        if (shrinkResult.compressionCount !== null) {
          this.keyManager.updateStats(keyStat.index, shrinkResult.compressionCount)

          // Emit quota update event
          this.emit('quotaUpdate', {
            keyIndex: keyStat.index,
            compressionCount: shrinkResult.compressionCount,
            remaining: keyStat.monthlyLimit - shrinkResult.compressionCount,
          })
        }

        // Step 2: Download compressed image (with optional resize)
        let downloadResponse

        if (options.resize) {
          // Apply resize before downloading
          const resizeResult = await TinyPNGService.resize(
            shrinkResult.outputUrl,
            options.resize,
            keyStat.key
          )

          // Update compression count from API response
          if (resizeResult.compressionCount !== null) {
            this.keyManager.updateStats(keyStat.index, resizeResult.compressionCount)

            // Emit quota update event
            this.emit('quotaUpdate', {
              keyIndex: keyStat.index,
              compressionCount: resizeResult.compressionCount,
              remaining: keyStat.monthlyLimit - resizeResult.compressionCount,
            })
          }

          downloadResponse = resizeResult.response
        } else {
          // Download directly without resize
          downloadResponse = await TinyPNGService.download(shrinkResult.outputUrl, keyStat.key)
        }

        const compressedBuffer = Buffer.from(await downloadResponse.arrayBuffer())
        const compressionRatio = ((1 - compressedBuffer.length / originalSize) * 100).toFixed(2)

        // Get final stats
        const finalKeyStat = this.keyManager.getCurrentKey()

        this.emit('success', {
          keyIndex: finalKeyStat.index,
          originalSize,
          compressedSize: compressedBuffer.length,
          savedBytes: originalSize - compressedBuffer.length,
          compressionRatio: `${compressionRatio}%`,
          filename,
          compressionCount: finalKeyStat.compressionCount,
          remaining:
            finalKeyStat.compressionCount === null
              ? null
              : finalKeyStat.monthlyLimit - finalKeyStat.compressionCount,
        })

        return compressedBuffer
      } catch (error) {
        lastError = error

        // Handle API errors from service layer
        if (error.status && keyStat) {
          await this._handleServiceError(error, keyStat, attempt, maxRetries)
        } else {
          // Handle network and other errors
          this.emit('error', {
            type: 'unknown',
            keyIndex: keyStat?.index,
            error,
          })

          // Retry on network errors
          if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ETIMEDOUT') {
            if (attempt < maxRetries - 1) {
              await this._delay(1000 * (attempt + 1))
              continue
            }
          } else {
            // Unknown error, don't retry
            throw error
          }
        }
      }
    }

    // All retries failed
    throw new Error(`压缩失败，已尝试 ${maxRetries} 次: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Handle errors from TinyPNG service layer
   * @private
   */
  async _handleServiceError(error, keyStat, attempt, maxRetries) {
    // Handle different HTTP status codes
    if (error.status === 401) {
      // Unauthorized - invalid API key
      this.keyManager.markKeyError(keyStat.index, error)

      this.emit('keyError', {
        keyIndex: keyStat.index,
        error: error.message,
      })

      this.emit('error', {
        type: 'account',
        keyIndex: keyStat.index,
        message: 'API Key 无效',
        error,
        status: 401,
      })

      // Next iteration will select a different key
      throw error
    } else if (error.status === 429) {
      // Too Many Requests - rate limit exceeded
      this.keyManager.markKeyError(keyStat.index, error)

      this.emit('keyError', {
        keyIndex: keyStat.index,
        error: error.message,
      })

      this.emit('error', {
        type: 'account',
        keyIndex: keyStat.index,
        message: 'API Key 已达到月度限制',
        error,
        status: 429,
      })

      // Next iteration will select a different key
      throw error
    } else if (error.status === 400 || error.status === 415) {
      // Bad Request or Unsupported Media Type
      this.emit('error', {
        type: 'client',
        message: '请求错误，请检查输入图片格式',
        error,
        status: error.status,
      })
      throw error
    } else if (error.status >= 500) {
      // Server Error
      this.emit('error', {
        type: 'server',
        keyIndex: keyStat.index,
        message: 'TinyPNG 服务器错误，稍后重试',
        error,
        status: error.status,
      })

      // Retry with exponential backoff
      if (attempt < maxRetries - 1) {
        await this._delay(1000 * (attempt + 1))
      }
      throw error
    } else {
      // Other errors
      this.emit('error', {
        type: 'unknown',
        keyIndex: keyStat.index,
        message: `HTTP ${error.status}: ${error.statusText}`,
        error,
        status: error.status,
      })
      throw error
    }
  }

  /**
   * Compress and save to file
   * @param {string|Buffer|Readable} source - File path, buffer, or stream
   * @param {string} outputPath - Output file path
   * @param {Object} [options] - Compression options
   * @returns {Promise<Object>} Compression result with file info
   */
  async compressToFile(source, outputPath, options = {}) {
    const compressedBuffer = await this.compress(source, options)
    writeFileSync(outputPath, compressedBuffer)

    return {
      outputPath,
      size: compressedBuffer.length,
    }
  }

  /**
   * Get compression stats for all API keys
   * @returns {Array<Object>} Stats for each API key
   */
  getStats() {
    return this.keyManager.getStats()
  }

  /**
   * Get summary statistics across all keys
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return this.keyManager.getSummary()
  }

  /**
   * Reset compression counts (call at the start of each month)
   */
  resetCounts() {
    this.keyManager.reset()

    this.emit('reset', {
      message: '所有 API Key 的使用统计已重置',
    })
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
