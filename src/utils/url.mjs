/**
 * URL utility functions for handling image URLs
 */

/**
 * Check if a string is a valid HTTP/HTTPS URL
 * @param {string} str - String to check
 * @returns {boolean} True if string is a valid URL
 */
export function isUrl(str) {
  return typeof str === 'string' && /^https?:\/\//i.test(str)
}

/**
 * Extract filename from a URL
 * @param {string} url - URL to extract filename from
 * @returns {string} Filename or 'image' as fallback
 */
export function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop()
    return filename || 'image'
  } catch {
    // Fallback for invalid URLs
    return url.split('/').pop() || 'image'
  }
}

