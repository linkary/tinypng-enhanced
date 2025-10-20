/**
 * Compression workflow orchestration
 * Handles the complete compression pipeline with progress tracking
 */

import { sourceToBuffer } from '../utils/source-to-buffer.mjs'
import { isUrl, getFilenameFromUrl } from '../utils/url.mjs'
import { calculateCompressionRatio } from '../utils/compression.mjs'
import {
  calculateUploadProgress,
  calculateDownloadProgress,
  calculateResizeProgress,
  formatProgressMessage,
} from '../utils/progress.mjs'
import {
  createStartEvent,
  createCompressingEvent,
  createProgressEvent,
  createQuotaUpdateEvent,
  createSuccessEvent,
  createErrorEvent,
} from '../utils/event.mjs'
import {
  shouldRetryOnNetworkError,
  shouldMarkKeyError,
  getErrorType,
  getErrorMessage,
  isServerError,
  calculateRetryDelay,
} from '../utils/error.mjs'
import * as TinyPNGService from '../service.mjs'

/**
 * Prepare source for compression
 * @param {string|Buffer|Readable} source - Source input
 * @param {Function} emitFn - Event emission function
 * @returns {Promise<Object>} Prepared source data
 */
export async function prepareSource(source, emitFn) {
  const isSourceUrl = isUrl(source)

  if (isSourceUrl) {
    const filename = getFilenameFromUrl(source)
    const type = 'url'
    const size = null
    const originalSize = null

    emitFn('start', createStartEvent(type, filename, size))

    return { isSourceUrl, filename, type, size, originalSize, buffer: null }
  }

  // Convert local source to buffer
  const sourceInfo = await sourceToBuffer(source)
  const buffer = sourceInfo.buffer
  const filename = sourceInfo.filename
  const type = sourceInfo.type
  const size = sourceInfo.size
  const originalSize = buffer.length

  emitFn('start', createStartEvent(type, filename, size))

  return { isSourceUrl, filename, type, size, originalSize, buffer }
}

/**
 * Upload and shrink image
 * @param {Object} sourceData - Prepared source data
 * @param {string} source - Original source (for URLs)
 * @param {Object} keyStat - Selected API key stats
 * @param {Function} emitFn - Event emission function
 * @returns {Promise<Object>} Shrink result with outputUrl and compressionCount
 */
export async function uploadAndShrink(sourceData, source, keyStat, emitFn) {
  if (sourceData.isSourceUrl) {
    // Upload from URL (no progress tracking for URL uploads)
    emitFn('progress', createProgressEvent('uploading', 0.2, 'Fetching from URL...'))
    return await TinyPNGService.shrinkFromUrl(source, keyStat.key)
  }

  // Upload from buffer with real-time progress
  emitFn('progress', createProgressEvent('uploading', 0.05, 'Starting upload...'))

  const shrinkResult = await TinyPNGService.shrink(
    sourceData.buffer,
    keyStat.key,
    (bytesUploaded, totalBytes) => {
      const overallProgress = calculateUploadProgress(bytesUploaded, totalBytes)
      const uploadProgress = totalBytes > 0 ? bytesUploaded / totalBytes : 0

      emitFn(
        'progress',
        createProgressEvent(
          'uploading',
          overallProgress,
          formatProgressMessage('Uploading', uploadProgress),
          {
            bytesUploaded,
            totalBytes,
          }
        )
      )
    }
  )

  // Emit completion after upload finishes
  emitFn('progress', createProgressEvent('uploading', 0.35, 'Upload complete'))

  return shrinkResult
}

/**
 * Download compressed or resized image
 * @param {string} outputUrl - Output URL from shrink
 * @param {Object} options - Compression options
 * @param {Object} keyStat - Selected API key stats
 * @param {Function} emitFn - Event emission function
 * @returns {Promise<Response>} Download response
 */
export async function downloadImage(outputUrl, options, keyStat, emitFn) {
  if (options.resize) {
    // Apply resize with progress tracking
    emitFn('progress', createProgressEvent('resizing', 0.5, 'Applying resize...'))

    const resizeResult = await TinyPNGService.resize(
      outputUrl,
      options.resize,
      keyStat.key,
      (bytesReceived, totalBytes) => {
        const overallProgress = calculateResizeProgress(bytesReceived, totalBytes)
        const downloadProgress = totalBytes > 0 ? bytesReceived / totalBytes : 0

        emitFn(
          'progress',
          createProgressEvent(
            'resizing',
            overallProgress,
            formatProgressMessage('Resizing', downloadProgress),
            {
              bytesReceived,
              totalBytes,
            }
          )
        )
      }
    )

    // Emit completion after resize finishes
    emitFn('progress', createProgressEvent('resizing', 0.85, 'Resize complete'))

    return resizeResult
  }

  // Download directly without resize with real progress tracking
  emitFn('progress', createProgressEvent('downloading', 0.6, 'Downloading result...'))

  const downloadResponse = await TinyPNGService.download(
    outputUrl,
    keyStat.key,
    (bytesReceived, totalBytes) => {
      const overallProgress = calculateDownloadProgress(bytesReceived, totalBytes)
      const downloadProgress = totalBytes > 0 ? bytesReceived / totalBytes : 0

      emitFn(
        'progress',
        createProgressEvent(
          'downloading',
          overallProgress,
          formatProgressMessage('Downloading', downloadProgress),
          {
            bytesReceived,
            totalBytes,
          }
        )
      )
    }
  )

  // Emit completion after download finishes
  emitFn('progress', createProgressEvent('downloading', 0.9, 'Download complete'))

  return { response: downloadResponse, compressionCount: null }
}

/**
 * Finalize compression result
 * @param {Response} downloadResponse - Download response
 * @param {Object} sourceData - Original source data
 * @param {Object} finalKeyStat - Final API key stats
 * @param {Function} emitFn - Event emission function
 * @returns {Promise<Buffer>} Compressed image buffer
 */
export async function finalizeResult(downloadResponse, sourceData, finalKeyStat, emitFn) {
  const compressedBuffer = Buffer.from(await downloadResponse.arrayBuffer())

  // For URLs, we use compressed size as original (can't know real original)
  const finalOriginalSize = sourceData.originalSize || compressedBuffer.length
  const compressionRatio = sourceData.originalSize
    ? calculateCompressionRatio(sourceData.originalSize, compressedBuffer.length)
    : '0.00'

  emitFn('progress', createProgressEvent('complete', 1.0, 'Compression complete'))

  emitFn(
    'success',
    createSuccessEvent(
      finalKeyStat.index,
      finalOriginalSize,
      compressedBuffer.length,
      compressionRatio,
      sourceData.filename,
      finalKeyStat.compressionCount,
      finalKeyStat.monthlyLimit
    )
  )

  return compressedBuffer
}

/**
 * Update quota stats after API operation
 * @param {Object} result - API result with compressionCount
 * @param {Object} keyStat - API key stats
 * @param {Object} keyManager - Key manager instance
 * @param {Function} emitFn - Event emission function
 */
export function updateQuota(result, keyStat, keyManager, emitFn) {
  if (result.compressionCount !== null) {
    keyManager.updateStats(keyStat.index, result.compressionCount)

    emitFn(
      'quotaUpdate',
      createQuotaUpdateEvent(keyStat.index, result.compressionCount, keyStat.monthlyLimit)
    )
  }
}

/**
 * Handle service errors with retry logic
 * @param {Error} error - Error object
 * @param {Object} keyStat - API key stats
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum retry attempts
 * @param {Object} keyManager - Key manager instance
 * @param {Function} emitFn - Event emission function
 * @param {Function} delayFn - Delay function
 * @returns {Promise<void>}
 */
export async function handleServiceError(error, keyStat, attempt, maxRetries, keyManager, emitFn, delayFn) {
  // Mark key as errored if appropriate
  if (shouldMarkKeyError(error)) {
    keyManager.markKeyError(keyStat.index, error)
    emitFn('keyError', { keyIndex: keyStat.index, error: error.message })
  }

  // Get error type and message
  const errorType = getErrorType(error)
  const errorMessage = getErrorMessage(error)

  // Emit error event
  emitFn('error', createErrorEvent(errorType, keyStat.index, errorMessage, error, error.status))

  // Retry on server errors with exponential backoff
  if (isServerError(error) && attempt < maxRetries - 1) {
    await delayFn(calculateRetryDelay(attempt))
  }

  // Always throw to trigger retry loop
  throw error
}

/**
 * Handle network errors with retry logic
 * @param {Error} error - Error object
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number|null} keyIndex - Current key index
 * @param {Function} emitFn - Event emission function
 * @param {Function} delayFn - Delay function
 * @returns {Promise<boolean>} True if should continue retry loop
 */
export async function handleNetworkError(error, attempt, maxRetries, keyIndex, emitFn, delayFn) {
  emitFn('error', createErrorEvent('unknown', keyIndex, '', error))

  // Retry on network errors
  if (shouldRetryOnNetworkError(error)) {
    if (attempt < maxRetries - 1) {
      await delayFn(calculateRetryDelay(attempt))
      return true // Continue retry loop
    }
  }

  // Unknown error or max retries reached, don't retry
  throw error
}
