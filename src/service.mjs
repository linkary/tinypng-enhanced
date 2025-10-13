/**
 * Pure TinyPNG API Service Layer
 * Provides stateless functions for interacting with TinyPNG API
 * @see https://tinypng.com/developers/reference
 */

/**
 * TinyPNG API base URL
 */
import { TINYPNG_API_BASE } from './constant.mjs'

/**
 * Create Basic Auth header for TinyPNG API
 * @param {string} apiKey - TinyPNG API key
 * @returns {string} Authorization header value
 */
export function createAuthHeader(apiKey) {
  const credentials = `api:${apiKey}`
  const encoded = Buffer.from(credentials).toString('base64')
  return `Basic ${encoded}`
}

/**
 * Parse error response from TinyPNG API
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed error object
 */
export async function parseApiError(response) {
  const error = {
    status: response.status,
    statusText: response.statusText,
    message: `TinyPNG API error: ${response.status} ${response.statusText}`,
    errorType: null,
  }

  try {
    const errorData = await response.json()
    error.message = errorData.message || error.message
    error.errorType = errorData.error
  } catch (e) {
    // Response body might not be JSON
  }

  return error
}

/**
 * Make a request to TinyPNG API with common error handling
 * @private
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options (method, headers, body)
 * @param {string} apiKey - TinyPNG API key
 * @returns {Promise<Object>} Response and compression count
 * @throws {Error} If request fails
 */
async function request(url, options, apiKey) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: createAuthHeader(apiKey),
      ...options.headers,
    },
  })

  const compressionCount = response.headers.get('Compression-Count')

  if (!response.ok) {
    const error = await parseApiError(response)
    const apiError = new Error(error.message)
    apiError.status = error.status
    apiError.statusText = error.statusText
    apiError.errorType = error.errorType
    throw apiError
  }

  return {
    response,
    compressionCount: compressionCount ? parseInt(compressionCount, 10) : null,
  }
}

/**
 * Upload and compress image using TinyPNG API
 * @param {Buffer} buffer - Image buffer to compress
 * @param {string} apiKey - TinyPNG API key
 * @returns {Promise<Object>} Compression result with output URL and compression count
 * @throws {Error} If compression fails
 */
export async function shrink(buffer, apiKey) {
  const { response, compressionCount } = await request(
    `${TINYPNG_API_BASE}/shrink`,
    {
      method: 'POST',
      body: buffer,
    },
    apiKey
  )

  const outputUrl = response.headers.get('Location')

  if (!outputUrl) {
    throw new Error('TinyPNG API 未返回 Location 头')
  }

  const data = await response.json()

  return {
    outputUrl,
    compressionCount,
    data,
  }
}

/**
 * Apply resize transformation to compressed image
 * @param {string} url - Output URL from shrink operation
 * @param {Object} resizeOptions - Resize options
 * @param {string} resizeOptions.method - Resize method (scale, fit, cover, thumb)
 * @param {number} [resizeOptions.width] - Target width
 * @param {number} [resizeOptions.height] - Target height
 * @param {string} apiKey - TinyPNG API key
 * @returns {Promise<Object>} Resize result with response and compression count
 * @throws {Error} If resize fails
 */
export async function resize(url, resizeOptions, apiKey) {
  return request(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resize: resizeOptions }),
    },
    apiKey
  )
}

/**
 * Convert compressed image to different format(s)
 * @param {string} url - Output URL from shrink operation
 * @param {Object} convertOptions - Convert options
 * @param {string|string[]} convertOptions.type - Target format(s) (e.g., 'image/webp', ['image/webp', 'image/png'])
 * @param {string} apiKey - TinyPNG API key
 * @returns {Promise<Object>} Convert result with response and compression count
 * @throws {Error} If conversion fails
 */
export async function convert(url, convertOptions, apiKey) {
  return request(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ convert: convertOptions }),
    },
    apiKey
  )
}

/**
 * Download processed image from TinyPNG
 * @param {string} url - Output URL to download from
 * @param {string} apiKey - TinyPNG API key
 * @returns {Promise<Response>} Fetch response object
 * @throws {Error} If download fails
 */
export async function download(url, apiKey) {
  const { response } = await request(
    url,
    {
      method: 'GET',
    },
    apiKey
  )

  return response
}
