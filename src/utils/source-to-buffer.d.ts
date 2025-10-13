import { Readable } from 'node:stream'

/**
 * Source metadata with buffer
 */
export interface SourceMetadata {
  /** Image buffer */
  buffer: Buffer
  /** Filename (if available) */
  filename?: string
  /** Source type */
  type: 'file' | 'stream' | 'buffer'
  /** Original size (if available before streaming) */
  size?: number
}

/**
 * Convert various source types to buffer
 * @param source - File path, buffer, or readable stream
 * @returns Source metadata and buffer
 * @throws {TypeError} If source type is not supported
 */
export function sourceToBuffer(source: string | Buffer | Readable): Promise<SourceMetadata>
