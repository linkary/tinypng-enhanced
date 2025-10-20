import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { createCompressingEvent, createProgressEvent } from './utils/event.mjs'
import { KeyManager } from './key-manager.mjs'
import * as CompressionWorkflow from './workflows/compression.mjs'

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
   * Compress a file, buffer, or URL using TinyPNG API
   * @param {string|Buffer|Readable} source - File path, URL, buffer, or readable stream
   * @param {Object} [options] - Compression options
   * @param {Object} [options.resize] - Resize options
   * @param {string} [options.resize.method] - Resize method (scale, fit, cover, thumb)
   * @param {number} [options.resize.width] - Target width
   * @param {number} [options.resize.height] - Target height
   * @returns {Promise<Buffer>} Compressed image buffer
   * @see https://tinypng.com/developers/reference#request-options
   */
  async compress(source, options = {}) {
    // Prepare source for compression
    const sourceData = await CompressionWorkflow.prepareSource(source, this.emit.bind(this))

    // Try compression with key rotation
    let lastError
    const maxRetries = this.keyManager.getTotalKeys()

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let keyStat

      try {
        // Select best available key (least-used strategy)
        keyStat = this.keyManager.selectBestKey()

        this.emit(
          'compressing',
          createCompressingEvent(
            keyStat.index,
            attempt + 1,
            maxRetries,
            keyStat.compressionCount,
            keyStat.monthlyLimit
          )
        )

        // Step 1: Upload and compress image
        const shrinkResult = await CompressionWorkflow.uploadAndShrink(
          sourceData,
          source,
          keyStat,
          this.emit.bind(this)
        )

        this.emit('progress', createProgressEvent('compressed', 0.4, 'Image compressed'))

        // Update quota after shrink
        CompressionWorkflow.updateQuota(shrinkResult, keyStat, this.keyManager, this.emit.bind(this))

        // Step 2: Download compressed or resized image
        const downloadResult = await CompressionWorkflow.downloadImage(
          shrinkResult.outputUrl,
          options,
          keyStat,
          this.emit.bind(this)
        )

        // Update quota after download/resize if applicable
        CompressionWorkflow.updateQuota(downloadResult, keyStat, this.keyManager, this.emit.bind(this))

        // Step 3: Finalize and return result
        const finalKeyStat = this.keyManager.getCurrentKey()
        return await CompressionWorkflow.finalizeResult(
          downloadResult.response,
          sourceData,
          finalKeyStat,
          this.emit.bind(this)
        )
      } catch (error) {
        lastError = error

        // Handle API errors from service layer
        if (error.status && keyStat) {
          await CompressionWorkflow.handleServiceError(
            error,
            keyStat,
            attempt,
            maxRetries,
            this.keyManager,
            this.emit.bind(this),
            this._delay.bind(this)
          )
        } else {
          // Handle network and other errors
          const shouldContinue = await CompressionWorkflow.handleNetworkError(
            error,
            attempt,
            maxRetries,
            keyStat?.index,
            this.emit.bind(this),
            this._delay.bind(this)
          )

          if (shouldContinue) {
            continue
          }
        }
      }
    }

    // All retries failed
    throw new Error(`压缩失败，已尝试 ${maxRetries} 次: ${lastError?.message || 'Unknown error'}`)
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
