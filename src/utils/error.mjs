/**
 * Error handling utilities for TinyPNG API
 */

/**
 * Check if error should trigger retry
 * @param {Error} error - Error object
 * @returns {boolean} True if should retry
 */
export function shouldRetryOnNetworkError(error) {
  return error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ETIMEDOUT'
}

/**
 * Check if error is an unauthorized error (401)
 * @param {Error} error - Error object with status property
 * @returns {boolean} True if unauthorized
 */
export function isUnauthorizedError(error) {
  return error.status === 401
}

/**
 * Check if error is a rate limit error (429)
 * @param {Error} error - Error object with status property
 * @returns {boolean} True if rate limited
 */
export function isRateLimitError(error) {
  return error.status === 429
}

/**
 * Check if error is a client error (400, 415)
 * @param {Error} error - Error object with status property
 * @returns {boolean} True if client error
 */
export function isClientError(error) {
  return error.status === 400 || error.status === 415
}

/**
 * Check if error is a server error (5xx)
 * @param {Error} error - Error object with status property
 * @returns {boolean} True if server error
 */
export function isServerError(error) {
  return error.status >= 500
}

/**
 * Get error type from error status
 * @param {Error} error - Error object with status property
 * @returns {string} Error type (account, client, server, unknown)
 */
export function getErrorType(error) {
  if (isUnauthorizedError(error) || isRateLimitError(error)) {
    return 'account'
  }
  if (isClientError(error)) {
    return 'client'
  }
  if (isServerError(error)) {
    return 'server'
  }
  return 'unknown'
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object with status property
 * @returns {string} User-friendly message in Chinese
 */
export function getErrorMessage(error) {
  if (isUnauthorizedError(error)) {
    return 'API Key 无效'
  }
  if (isRateLimitError(error)) {
    return 'API Key 已达到月度限制'
  }
  if (isClientError(error)) {
    return '请求错误，请检查输入图片格式'
  }
  if (isServerError(error)) {
    return 'TinyPNG 服务器错误，稍后重试'
  }
  return `HTTP ${error.status}: ${error.statusText}`
}

/**
 * Check if error should mark key as errored
 * @param {Error} error - Error object with status property
 * @returns {boolean} True if key should be marked as errored
 */
export function shouldMarkKeyError(error) {
  return isUnauthorizedError(error) || isRateLimitError(error)
}

/**
 * Calculate retry delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
export function calculateRetryDelay(attempt) {
  return 1000 * (attempt + 1)
}
