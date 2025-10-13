import { Readable } from 'node:stream'
import { randomBytes } from 'node:crypto'

/**
 * Generate a multipart form-data boundary
 * @returns {string} Boundary string
 */
export function generateBoundary() {
  return `----WebKitFormBoundary${randomBytes(16).toString('hex')}`
}

/**
 * Build multipart form-data from a file stream
 * @param {Readable} fileStream - File stream to upload
 * @param {string} filename - Filename for the upload
 * @param {string} boundary - Multipart boundary string
 * @param {Transform} [progressTracker] - Optional progress tracker stream
 * @returns {Promise<Object>} Multipart stream data
 * @returns {Readable} return.stream - Combined multipart stream
 * @returns {string} return.boundary - Boundary used
 * @returns {number} return.contentLength - Content length (without file size)
 */
export async function createMultipartStream(fileStream, filename, boundary, progressTracker) {
  // Add file field headers
  const fileHeader = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
    'utf-8'
  )

  const fileFooter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')

  // Calculate total size if possible
  const contentLength = fileHeader.length + fileFooter.length

  return {
    stream: Readable.from(
      (async function* () {
        // Yield header
        yield fileHeader

        // Yield file chunks (through progress tracker if provided)
        if (progressTracker) {
          const trackedStream = fileStream.pipe(progressTracker)
          for await (const chunk of trackedStream) {
            yield chunk
          }
        } else {
          for await (const chunk of fileStream) {
            yield chunk
          }
        }

        // Yield footer
        yield fileFooter
      })()
    ),
    boundary,
    contentLength, // Note: doesn't include file size unless known
  }
}
