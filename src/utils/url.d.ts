/**
 * Check if a string is a valid HTTP/HTTPS URL
 * @param str - String to check
 * @returns True if string is a valid URL
 */
export function isUrl(str: string): boolean

/**
 * Extract filename from a URL
 * @param url - URL to extract filename from
 * @returns Filename or 'image' as fallback
 */
export function getFilenameFromUrl(url: string): string

