/**
 * Event data creation utilities for TinyPNGCompressor
 */

/**
 * Create start event data
 * @param {string} type - Source type (file, buffer, stream, url)
 * @param {string} filename - File name
 * @param {number|null} size - File size in bytes
 * @returns {Object} Event data
 */
export function createStartEvent(type, filename, size) {
  return {
    type,
    filename,
    size,
  }
}

/**
 * Create compressing event data
 * @param {number} keyIndex - API key index
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number|null} compressionCount - Current compression count
 * @param {number} monthlyLimit - Monthly limit for the key
 * @returns {Object} Event data
 */
export function createCompressingEvent(keyIndex, attempt, maxRetries, compressionCount, monthlyLimit) {
  return {
    keyIndex,
    attempt,
    maxRetries,
    compressionCount,
    remaining: compressionCount === null ? 'unknown' : monthlyLimit - compressionCount,
  }
}

/**
 * Create progress event data
 * @param {string} stage - Current stage (uploading, compressed, resizing, downloading, complete)
 * @param {number} progress - Progress value (0-1)
 * @param {string} message - Progress message
 * @param {Object} [extra] - Additional data (bytesUploaded, totalBytes, etc.)
 * @returns {Object} Event data
 */
export function createProgressEvent(stage, progress, message, extra = {}) {
  return {
    stage,
    progress,
    message,
    ...extra,
  }
}

/**
 * Create quota update event data
 * @param {number} keyIndex - API key index
 * @param {number} compressionCount - Current compression count
 * @param {number} monthlyLimit - Monthly limit for the key
 * @returns {Object} Event data
 */
export function createQuotaUpdateEvent(keyIndex, compressionCount, monthlyLimit) {
  return {
    keyIndex,
    compressionCount,
    remaining: monthlyLimit - compressionCount,
  }
}

/**
 * Create success event data
 * @param {number} keyIndex - API key index
 * @param {number} originalSize - Original size in bytes
 * @param {number} compressedSize - Compressed size in bytes
 * @param {string} compressionRatio - Compression ratio percentage
 * @param {string} filename - File name
 * @param {number|null} compressionCount - Current compression count
 * @param {number} monthlyLimit - Monthly limit for the key
 * @returns {Object} Event data
 */
export function createSuccessEvent(
  keyIndex,
  originalSize,
  compressedSize,
  compressionRatio,
  filename,
  compressionCount,
  monthlyLimit
) {
  return {
    keyIndex,
    originalSize,
    compressedSize,
    savedBytes: originalSize - compressedSize,
    compressionRatio: `${compressionRatio}%`,
    filename,
    compressionCount,
    remaining: compressionCount === null ? null : monthlyLimit - compressionCount,
  }
}

/**
 * Create error event data
 * @param {string} type - Error type (account, client, server, unknown)
 * @param {number|null} keyIndex - API key index
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {number} [status] - HTTP status code
 * @returns {Object} Event data
 */
export function createErrorEvent(type, keyIndex, message, error, status = undefined) {
  const eventData = {
    type,
    keyIndex,
    message,
    error,
  }

  if (status !== undefined) {
    eventData.status = status
  }

  return eventData
}

/**
 * Create key error event data
 * @param {number} keyIndex - API key index
 * @param {string} errorMessage - Error message
 * @returns {Object} Event data
 */
export function createKeyErrorEvent(keyIndex, errorMessage) {
  return {
    keyIndex,
    error: errorMessage,
  }
}
