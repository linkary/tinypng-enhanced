import { Readable, Transform } from 'node:stream'

/**
 * Multipart stream result
 */
export interface MultipartStream {
  /** Combined multipart stream */
  stream: Readable
  /** Boundary used */
  boundary: string
  /** Content length (without file size) */
  contentLength: number
}

/**
 * Generate a multipart form-data boundary
 * @returns Boundary string
 */
export function generateBoundary(): string

/**
 * Build multipart form-data from a file stream
 * @param fileStream - File stream to upload
 * @param filename - Filename for the upload
 * @param boundary - Multipart boundary string
 * @param progressTracker - Optional progress tracker stream
 * @returns Multipart stream data
 */
export function createMultipartStream(
  fileStream: Readable,
  filename: string,
  boundary: string,
  progressTracker?: Transform
): Promise<MultipartStream>
