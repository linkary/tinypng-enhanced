import { Readable } from 'node:stream'

/**
 * File information result
 */
export interface FileInfo {
  /** Readable stream */
  stream: Readable
  /** Filename */
  filename?: string
  /** Total file size (NaN if unknown) */
  totalSize: number
}

/**
 * Get file information from various input types
 * @param file - File path or readable stream
 * @returns File information
 */
export function getFileInfo(file: string | Readable): FileInfo
