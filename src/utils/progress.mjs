/**
 * Progress calculation utilities
 */

/**
 * Calculate overall progress from byte-level progress within a range
 * @param {number} bytesProcessed - Bytes processed so far
 * @param {number} totalBytes - Total bytes to process
 * @param {number} startPercent - Starting percentage (0-1)
 * @param {number} endPercent - Ending percentage (0-1)
 * @returns {number} Overall progress (0-1)
 */
export function calculateProgressInRange(bytesProcessed, totalBytes, startPercent, endPercent) {
  if (totalBytes <= 0) return startPercent

  const progress = bytesProcessed / totalBytes
  const range = endPercent - startPercent
  return startPercent + progress * range
}

/**
 * Calculate upload progress (5% to 35% of total)
 * @param {number} bytesUploaded - Bytes uploaded so far
 * @param {number} totalBytes - Total bytes to upload
 * @returns {number} Overall progress (0-1)
 */
export function calculateUploadProgress(bytesUploaded, totalBytes) {
  return calculateProgressInRange(bytesUploaded, totalBytes, 0.05, 0.35)
}

/**
 * Calculate download progress (60% to 90% of total)
 * @param {number} bytesReceived - Bytes received so far
 * @param {number} totalBytes - Total bytes to receive
 * @returns {number} Overall progress (0-1)
 */
export function calculateDownloadProgress(bytesReceived, totalBytes) {
  return calculateProgressInRange(bytesReceived, totalBytes, 0.6, 0.9)
}

/**
 * Calculate resize/download progress (50% to 85% of total)
 * @param {number} bytesReceived - Bytes received so far
 * @param {number} totalBytes - Total bytes to receive
 * @returns {number} Overall progress (0-1)
 */
export function calculateResizeProgress(bytesReceived, totalBytes) {
  return calculateProgressInRange(bytesReceived, totalBytes, 0.5, 0.85)
}

/**
 * Format progress message with percentage
 * @param {string} stage - Stage name (e.g., 'Uploading', 'Downloading')
 * @param {number} progress - Progress (0-1)
 * @returns {string} Formatted message
 */
export function formatProgressMessage(stage, progress) {
  return `${stage}... (${Math.round(progress * 100)}%)`
}
