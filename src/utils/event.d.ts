/**
 * Event data creation utilities for TinyPNGCompressor
 */

/**
 * Create start event data
 * @param type - Source type (file, buffer, stream, url)
 * @param filename - File name
 * @param size - File size in bytes
 * @returns Event data
 */
export function createStartEvent(
  type: string,
  filename: string,
  size: number | null
): {
  type: string
  filename: string
  size: number | null
}

/**
 * Create compressing event data
 * @param keyIndex - API key index
 * @param attempt - Current attempt number
 * @param maxRetries - Maximum retry attempts
 * @param compressionCount - Current compression count
 * @param monthlyLimit - Monthly limit for the key
 * @returns Event data
 */
export function createCompressingEvent(
  keyIndex: number,
  attempt: number,
  maxRetries: number,
  compressionCount: number | null,
  monthlyLimit: number
): {
  keyIndex: number
  attempt: number
  maxRetries: number
  compressionCount: number | null
  remaining: number | 'unknown'
}

/**
 * Create progress event data
 * @param stage - Current stage (uploading, compressed, resizing, downloading, complete)
 * @param progress - Progress value (0-1)
 * @param message - Progress message
 * @param extra - Additional data (bytesUploaded, totalBytes, etc.)
 * @returns Event data
 */
export function createProgressEvent(
  stage: string,
  progress: number,
  message: string,
  extra?: Record<string, any>
): {
  stage: string
  progress: number
  message: string
  [key: string]: any
}

/**
 * Create quota update event data
 * @param keyIndex - API key index
 * @param compressionCount - Current compression count
 * @param monthlyLimit - Monthly limit for the key
 * @returns Event data
 */
export function createQuotaUpdateEvent(
  keyIndex: number,
  compressionCount: number,
  monthlyLimit: number
): {
  keyIndex: number
  compressionCount: number
  remaining: number
}

/**
 * Create success event data
 * @param keyIndex - API key index
 * @param originalSize - Original size in bytes
 * @param compressedSize - Compressed size in bytes
 * @param compressionRatio - Compression ratio percentage
 * @param filename - File name
 * @param compressionCount - Current compression count
 * @param monthlyLimit - Monthly limit for the key
 * @returns Event data
 */
export function createSuccessEvent(
  keyIndex: number,
  originalSize: number,
  compressedSize: number,
  compressionRatio: string,
  filename: string,
  compressionCount: number | null,
  monthlyLimit: number
): {
  keyIndex: number
  originalSize: number
  compressedSize: number
  savedBytes: number
  compressionRatio: string
  filename: string
  compressionCount: number | null
  remaining: number | null
}

/**
 * Create error event data
 * @param type - Error type (account, client, server, unknown)
 * @param keyIndex - API key index
 * @param message - Error message
 * @param error - Error object
 * @param status - HTTP status code
 * @returns Event data
 */
export function createErrorEvent(
  type: string,
  keyIndex: number | null,
  message: string,
  error: Error,
  status?: number
): {
  type: string
  keyIndex: number | null
  message: string
  error: Error
  status?: number
}

/**
 * Create key error event data
 * @param keyIndex - API key index
 * @param errorMessage - Error message
 * @returns Event data
 */
export function createKeyErrorEvent(
  keyIndex: number,
  errorMessage: string
): {
  keyIndex: number
  error: string
}
