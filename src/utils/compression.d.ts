/**
 * Calculate compression ratio as a percentage
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Compression ratio as percentage string (e.g., "60.64")
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): string

/**
 * Calculate saved bytes
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Bytes saved
 */
export function calculateSavedBytes(originalSize: number, compressedSize: number): number

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size (e.g., "1.5 MB", "512 KB", "128 B")
 */
export function formatSize(bytes: number): string

