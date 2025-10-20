/**
 * Compression utility functions for calculating and formatting compression results
 */

/**
 * Calculate compression ratio as a percentage
 * @param {number} originalSize - Original file size in bytes
 * @param {number} compressedSize - Compressed file size in bytes
 * @returns {string} Compression ratio as percentage string (e.g., "60.64")
 */
export function calculateCompressionRatio(originalSize, compressedSize) {
  if (originalSize <= 0) {
    return '0.00'
  }
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2)
  return ratio
}

/**
 * Calculate saved bytes
 * @param {number} originalSize - Original file size in bytes
 * @param {number} compressedSize - Compressed file size in bytes
 * @returns {number} Bytes saved
 */
export function calculateSavedBytes(originalSize, compressedSize) {
  return Math.max(0, originalSize - compressedSize)
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB", "512 KB", "128 B")
 */
export function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

