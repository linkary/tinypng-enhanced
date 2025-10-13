import { Readable } from 'node:stream'
import { getFileInfo } from './file-info.mjs'

/**
 * Convert various source types to buffer
 * @param {string|Buffer|Readable} source - File path, buffer, or readable stream
 * @returns {Promise<Object>} Source metadata and buffer
 * @returns {Buffer} return.buffer - Image buffer
 * @returns {string} [return.filename] - Filename (if available)
 * @returns {string} return.type - Source type: 'file', 'stream', or 'buffer'
 * @returns {number} [return.size] - Original size (if available before streaming)
 * @throws {TypeError} If source type is not supported
 */
export async function sourceToBuffer(source) {
  if (typeof source === 'string') {
    // File path
    const fileInfo = getFileInfo(source)
    const buffer = await streamToBuffer(fileInfo.stream)

    return {
      buffer,
      filename: fileInfo.filename,
      type: 'file',
      size: fileInfo.totalSize,
    }
  }

  if (source instanceof Readable) {
    // Stream
    const fileInfo = getFileInfo(source)
    const buffer = await streamToBuffer(fileInfo.stream)

    return {
      buffer,
      filename: fileInfo.filename,
      type: 'stream',
      size: fileInfo.totalSize,
    }
  }

  if (Buffer.isBuffer(source)) {
    // Buffer
    return {
      buffer: source,
      type: 'buffer',
      size: source.length,
    }
  }

  throw new TypeError('只支持文件路径、Buffer 或 Stream 实例')
}

/**
 * Convert stream to buffer
 * @private
 * @param {Readable} stream - Readable stream
 * @returns {Promise<Buffer>} Buffer containing all stream data
 */
async function streamToBuffer(stream) {
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}
