import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { basename } from 'node:path'

/**
 * Get file information from various input types
 * @param {string|Readable} file - File path or readable stream
 * @returns {Object} File information
 * @returns {Readable} return.stream - Readable stream
 * @returns {string} return.filename - Filename
 * @returns {number} return.totalSize - Total file size (NaN if unknown)
 */
export function getFileInfo(file) {
  let stream
  let filename
  let totalSize = NaN

  if (typeof file === 'string') {
    // File path
    stream = createReadStream(file)
    filename = basename(file)

    try {
      const stat = statSync(file)
      if (stat.isFile()) {
        totalSize = stat.size
      }
    } catch (e) {
      // Ignore stat errors
    }
  } else if (file instanceof Readable) {
    // Stream instance
    stream = file

    // Try to get filename from stream path
    if (file.path) {
      filename = basename(file.path)

      try {
        const stat = statSync(file.path)
        if (stat.isFile()) {
          totalSize = stat.size
        }
      } catch (e) {
        // Ignore stat errors
      }
    }
  } else {
    throw new TypeError('只支持传入文件路径或Stream实例')
  }

  return { stream, filename, totalSize }
}
