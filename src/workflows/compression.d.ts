/**
 * Compression workflow orchestration
 */

import { Readable } from 'node:stream'

/**
 * Prepared source data
 */
export interface SourceData {
  isSourceUrl: boolean
  filename: string
  type: string
  size: number | null
  originalSize: number | null
  buffer: Buffer | null
}

/**
 * Prepare source for compression
 * @param source - Source input
 * @param emitFn - Event emission function
 * @returns Prepared source data
 */
export function prepareSource(
  source: string | Buffer | Readable,
  emitFn: (event: string, data: any) => void
): Promise<SourceData>

/**
 * Upload and shrink image
 * @param sourceData - Prepared source data
 * @param source - Original source (for URLs)
 * @param keyStat - Selected API key stats
 * @param emitFn - Event emission function
 * @returns Shrink result with outputUrl and compressionCount
 */
export function uploadAndShrink(
  sourceData: SourceData,
  source: string | Buffer | Readable,
  keyStat: any,
  emitFn: (event: string, data: any) => void
): Promise<{ outputUrl: string; compressionCount: number | null }>

/**
 * Download compressed or resized image
 * @param outputUrl - Output URL from shrink
 * @param options - Compression options
 * @param keyStat - Selected API key stats
 * @param emitFn - Event emission function
 * @returns Download result with response and compressionCount
 */
export function downloadImage(
  outputUrl: string,
  options: { resize?: any },
  keyStat: any,
  emitFn: (event: string, data: any) => void
): Promise<{ response: Response; compressionCount: number | null }>

/**
 * Finalize compression result
 * @param downloadResponse - Download response
 * @param sourceData - Original source data
 * @param finalKeyStat - Final API key stats
 * @param emitFn - Event emission function
 * @returns Compressed image buffer
 */
export function finalizeResult(
  downloadResponse: Response,
  sourceData: SourceData,
  finalKeyStat: any,
  emitFn: (event: string, data: any) => void
): Promise<Buffer>

/**
 * Update quota stats after API operation
 * @param result - API result with compressionCount
 * @param keyStat - API key stats
 * @param keyManager - Key manager instance
 * @param emitFn - Event emission function
 */
export function updateQuota(
  result: { compressionCount: number | null },
  keyStat: any,
  keyManager: any,
  emitFn: (event: string, data: any) => void
): void

/**
 * Handle service errors with retry logic
 * @param error - Error object
 * @param keyStat - API key stats
 * @param attempt - Current attempt number
 * @param maxRetries - Maximum retry attempts
 * @param keyManager - Key manager instance
 * @param emitFn - Event emission function
 * @param delayFn - Delay function
 */
export function handleServiceError(
  error: Error & { status?: number },
  keyStat: any,
  attempt: number,
  maxRetries: number,
  keyManager: any,
  emitFn: (event: string, data: any) => void,
  delayFn: (ms: number) => Promise<void>
): Promise<void>

/**
 * Handle network errors with retry logic
 * @param error - Error object
 * @param attempt - Current attempt number
 * @param maxRetries - Maximum retry attempts
 * @param keyIndex - Current key index
 * @param emitFn - Event emission function
 * @param delayFn - Delay function
 * @returns True if should continue retry loop
 */
export function handleNetworkError(
  error: Error,
  attempt: number,
  maxRetries: number,
  keyIndex: number | null,
  emitFn: (event: string, data: any) => void,
  delayFn: (ms: number) => Promise<void>
): Promise<boolean>
