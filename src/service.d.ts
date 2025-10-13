/**
 * Pure TinyPNG API Service Layer Type Definitions
 */

/**
 * Error object returned by TinyPNG API
 */
export interface ApiError {
  status: number
  statusText: string
  message: string
  errorType: string | null
}

/**
 * Result from shrink operation
 */
export interface ShrinkResult {
  outputUrl: string
  compressionCount: number | null
  data: any
}

/**
 * Result from resize operation
 */
export interface ResizeResult {
  response: Response
  compressionCount: number | null
}

/**
 * Resize options for image transformation
 */
export interface ResizeOptions {
  method: 'scale' | 'fit' | 'cover' | 'thumb'
  width?: number
  height?: number
}

/**
 * Convert options for image format conversion
 */
export interface ConvertOptions {
  type: string | string[]
}

/**
 * Result from convert operation
 */
export interface ConvertResult {
  response: Response
  compressionCount: number | null
}

/**
 * Create Basic Auth header for TinyPNG API
 * @param apiKey - TinyPNG API key
 * @returns Authorization header value
 */
export function createAuthHeader(apiKey: string): string

/**
 * Parse error response from TinyPNG API
 * @param response - Fetch response object
 * @returns Parsed error object
 */
export function parseApiError(response: Response): Promise<ApiError>

/**
 * Upload and compress image using TinyPNG API
 * @param buffer - Image buffer to compress
 * @param apiKey - TinyPNG API key
 * @returns Compression result with output URL and compression count
 * @throws Error if compression fails
 */
export function shrink(buffer: Buffer, apiKey: string): Promise<ShrinkResult>

/**
 * Apply resize transformation to compressed image
 * @param url - Output URL from shrink operation
 * @param resizeOptions - Resize options
 * @param apiKey - TinyPNG API key
 * @returns Resize result with response and compression count
 * @throws Error if resize fails
 */
export function resize(url: string, resizeOptions: ResizeOptions, apiKey: string): Promise<ResizeResult>

/**
 * Convert compressed image to different format(s)
 * @param url - Output URL from shrink operation
 * @param convertOptions - Convert options
 * @param apiKey - TinyPNG API key
 * @returns Convert result with response and compression count
 * @throws Error if conversion fails
 */
export function convert(url: string, convertOptions: ConvertOptions, apiKey: string): Promise<ConvertResult>

/**
 * Download processed image from TinyPNG
 * @param url - Output URL to download from
 * @param apiKey - TinyPNG API key
 * @returns Fetch response object
 * @throws Error if download fails
 */
export function download(url: string, apiKey: string): Promise<Response>
