/**
 * Pure TinyPNG API Service Layer
 * Provides stateless functions for interacting with TinyPNG API
 * @see https://tinypng.com/developers/reference
 */

/**
 * TinyPNG API base URL
 */
import { TINYPNG_API_BASE } from './constant.mjs'
import { Readable } from 'node:stream'

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
 * Create a Node.js Readable stream that tracks upload progress
 * @param {Buffer} buffer - Buffer to upload
 * @param {Function} onProgress - Progress callback (bytesUploaded, totalBytes)
 * @returns {Readable}
 */
function createProgressTrackingStream(buffer, onProgress) {
  const totalBytes = buffer.length
  const chunkSize = 65536 // 64KB chunks for smooth progress
  let offset = 0
  let bytesUploaded = 0

  const stream = new Readable({
    read() {
      if (offset >= buffer.length) {
        this.push(null) // Signal end of stream
        return
      }

      const end = Math.min(offset + chunkSize, buffer.length)
      const chunk = buffer.subarray(offset, end)

      bytesUploaded += chunk.length
      offset = end

      // Call progress callback
      if (onProgress) {
        onProgress(bytesUploaded, totalBytes)
      }

      this.push(chunk)
    },
  })

  return stream
}

/**
 * Upload and compress image using TinyPNG API (local file/buffer)
 * @param {Buffer} buffer - Image buffer to compress
 * @param {string} apiKey - TinyPNG API key
 * @param {Function} onProgress - Optional progress callback (bytesUploaded, totalBytes)
 * @returns {Promise<Object>} Compression result with output URL and compression count
 * @throws {Error} If compression fails
 */
export async function shrink(buffer, apiKey, onProgress = null) {
  const options = {
    method: 'POST',
    body: onProgress ? createProgressTrackingStream(buffer, onProgress) : buffer,
  }

  // When using stream as body, Node.js fetch requires duplex option
  if (onProgress) {
    options.duplex = 'half'
  }

  const { response, compressionCount } = await request(`${TINYPNG_API_BASE}/shrink`, options, apiKey)

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
 * Compress image from URL using TinyPNG API
 * @param {string} imageUrl - URL of the image to compress
 * @param {string} apiKey - TinyPNG API key
 * @returns {Promise<Object>} Compression result with output URL and compression count
 * @throws {Error} If compression fails
 */
export async function shrinkFromUrl(imageUrl, apiKey) {
  const { response, compressionCount } = await request(
    `${TINYPNG_API_BASE}/shrink`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: { url: imageUrl } }),
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
 * @param {Function} [onProgress] - Progress callback (bytesReceived, totalBytes)
 * @returns {Promise<Object>} Resize result with response and compression count
 * @throws {Error} If resize fails
 */
export async function resize(url, resizeOptions, apiKey, onProgress = null) {
  const { response, compressionCount } = await request(
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

  // If no progress callback, return response directly
  if (!onProgress) {
    return { response, compressionCount }
  }

  // Track download progress of resized image
  const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10)
  let bytesReceived = 0
  const chunks = []

  if (response.body) {
    const reader = response.body.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        bytesReceived += value.length

        onProgress(bytesReceived, contentLength)
      }
    } finally {
      reader.releaseLock()
    }

    // Create a new response with the collected data
    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
    const progressResponse = new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

    return { response: progressResponse, compressionCount }
  }

  return { response, compressionCount }
}

/**
 * Convert compressed image to different format(s)
 * @param {string} url - Output URL from shrink operation
 * @param {Object} convertOptions - Convert options
 * @param {string|string[]} convertOptions.type - Target format(s) (e.g., 'image/webp', ['image/webp', 'image/png'])
 * @param {string} apiKey - TinyPNG API key
 * @param {Function} [onProgress] - Progress callback (bytesReceived, totalBytes)
 * @returns {Promise<Object>} Convert result with response and compression count
 * @throws {Error} If conversion fails
 */
export async function convert(url, convertOptions, apiKey, onProgress = null) {
  const { response, compressionCount } = await request(
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

  // If no progress callback, return response directly
  if (!onProgress) {
    return { response, compressionCount }
  }

  // Track download progress of converted image
  const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10)
  let bytesReceived = 0
  const chunks = []

  if (response.body) {
    const reader = response.body.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        bytesReceived += value.length

        onProgress(bytesReceived, contentLength)
      }
    } finally {
      reader.releaseLock()
    }

    // Create a new response with the collected data
    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
    const progressResponse = new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

    return { response: progressResponse, compressionCount }
  }

  return { response, compressionCount }
}

/**
 * Download processed image from TinyPNG with progress tracking
 * @param {string} url - Output URL to download from
 * @param {string} apiKey - TinyPNG API key
 * @param {Function} [onProgress] - Progress callback (bytesReceived, totalBytes)
 * @returns {Promise<Response>} Fetch response object
 * @throws {Error} If download fails
 */
export async function download(url, apiKey, onProgress = null) {
  const { response } = await request(
    url,
    {
      method: 'GET',
    },
    apiKey
  )

  // If no progress callback or no body stream, return response directly
  if (!onProgress || !response.body) {
    return response
  }

  // Track download progress with ReadableStream
  const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10)
  let bytesReceived = 0
  const chunks = []

  const reader = response.body.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      chunks.push(value)
      bytesReceived += value.length

      // Call progress callback with bytes received and total
      onProgress(bytesReceived, contentLength)
    }
  } finally {
    reader.releaseLock()
  }

  // Create a new response with the collected data
  const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
  return new Response(buffer, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
