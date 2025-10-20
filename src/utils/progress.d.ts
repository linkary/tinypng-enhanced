/**
 * Calculate overall progress from byte-level progress within a range
 * @param bytesProcessed - Bytes processed so far
 * @param totalBytes - Total bytes to process
 * @param startPercent - Starting percentage (0-1)
 * @param endPercent - Ending percentage (0-1)
 * @returns Overall progress (0-1)
 */
export function calculateProgressInRange(
  bytesProcessed: number,
  totalBytes: number,
  startPercent: number,
  endPercent: number
): number

/**
 * Calculate upload progress (5% to 35% of total)
 * @param bytesUploaded - Bytes uploaded so far
 * @param totalBytes - Total bytes to upload
 * @returns Overall progress (0-1)
 */
export function calculateUploadProgress(bytesUploaded: number, totalBytes: number): number

/**
 * Calculate download progress (60% to 90% of total)
 * @param bytesReceived - Bytes received so far
 * @param totalBytes - Total bytes to receive
 * @returns Overall progress (0-1)
 */
export function calculateDownloadProgress(bytesReceived: number, totalBytes: number): number

/**
 * Calculate resize/download progress (50% to 85% of total)
 * @param bytesReceived - Bytes received so far
 * @param totalBytes - Total bytes to receive
 * @returns Overall progress (0-1)
 */
export function calculateResizeProgress(bytesReceived: number, totalBytes: number): number

/**
 * Format progress message with percentage
 * @param stage - Stage name (e.g., 'Uploading', 'Downloading')
 * @param progress - Progress (0-1)
 * @returns Formatted message
 */
export function formatProgressMessage(stage: string, progress: number): string
