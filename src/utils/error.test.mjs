/**
 * Unit tests for error.mjs
 */

import { describe, it, expect } from 'vitest'
import {
  shouldRetryOnNetworkError,
  isUnauthorizedError,
  isRateLimitError,
  isClientError,
  isServerError,
  getErrorType,
  getErrorMessage,
  shouldMarkKeyError,
  calculateRetryDelay,
} from './error.mjs'

describe('error utils', () => {
  describe('shouldRetryOnNetworkError()', () => {
    it('should return true for ECONNREFUSED', () => {
      const error = {
        cause: { code: 'ECONNREFUSED' },
      }
      expect(shouldRetryOnNetworkError(error)).toBe(true)
    })

    it('should return true for ETIMEDOUT', () => {
      const error = {
        cause: { code: 'ETIMEDOUT' },
      }
      expect(shouldRetryOnNetworkError(error)).toBe(true)
    })

    it('should return false for other error codes', () => {
      expect(shouldRetryOnNetworkError({ cause: { code: 'ENOTFOUND' } })).toBe(false)
      expect(shouldRetryOnNetworkError({ cause: { code: 'ECONNRESET' } })).toBe(false)
      expect(shouldRetryOnNetworkError({ cause: { code: 'EHOSTUNREACH' } })).toBe(false)
    })

    it('should return false when no cause', () => {
      expect(shouldRetryOnNetworkError({})).toBe(false)
      expect(shouldRetryOnNetworkError({ cause: {} })).toBe(false)
      expect(shouldRetryOnNetworkError({ cause: null })).toBe(false)
    })

    it('should return false for non-network errors', () => {
      expect(shouldRetryOnNetworkError(new Error('Generic error'))).toBe(false)
      expect(shouldRetryOnNetworkError({ message: 'Error' })).toBe(false)
    })
  })

  describe('isUnauthorizedError()', () => {
    it('should return true for 401 status', () => {
      expect(isUnauthorizedError({ status: 401 })).toBe(true)
    })

    it('should return false for other status codes', () => {
      expect(isUnauthorizedError({ status: 200 })).toBe(false)
      expect(isUnauthorizedError({ status: 400 })).toBe(false)
      expect(isUnauthorizedError({ status: 403 })).toBe(false)
      expect(isUnauthorizedError({ status: 404 })).toBe(false)
      expect(isUnauthorizedError({ status: 429 })).toBe(false)
      expect(isUnauthorizedError({ status: 500 })).toBe(false)
    })

    it('should return false when no status', () => {
      expect(isUnauthorizedError({})).toBe(false)
      expect(isUnauthorizedError({ status: undefined })).toBe(false)
    })
  })

  describe('isRateLimitError()', () => {
    it('should return true for 429 status', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true)
    })

    it('should return false for other status codes', () => {
      expect(isRateLimitError({ status: 200 })).toBe(false)
      expect(isRateLimitError({ status: 400 })).toBe(false)
      expect(isRateLimitError({ status: 401 })).toBe(false)
      expect(isRateLimitError({ status: 500 })).toBe(false)
    })
  })

  describe('isClientError()', () => {
    it('should return true for 400 status', () => {
      expect(isClientError({ status: 400 })).toBe(true)
    })

    it('should return true for 415 status', () => {
      expect(isClientError({ status: 415 })).toBe(true)
    })

    it('should return false for other status codes', () => {
      expect(isClientError({ status: 200 })).toBe(false)
      expect(isClientError({ status: 401 })).toBe(false)
      expect(isClientError({ status: 404 })).toBe(false)
      expect(isClientError({ status: 429 })).toBe(false)
      expect(isClientError({ status: 500 })).toBe(false)
    })

    it('should return false for other 4xx errors', () => {
      expect(isClientError({ status: 403 })).toBe(false)
      expect(isClientError({ status: 404 })).toBe(false)
      expect(isClientError({ status: 422 })).toBe(false)
    })
  })

  describe('isServerError()', () => {
    it('should return true for 5xx status codes', () => {
      expect(isServerError({ status: 500 })).toBe(true)
      expect(isServerError({ status: 501 })).toBe(true)
      expect(isServerError({ status: 502 })).toBe(true)
      expect(isServerError({ status: 503 })).toBe(true)
      expect(isServerError({ status: 504 })).toBe(true)
      expect(isServerError({ status: 550 })).toBe(true)
    })

    it('should return false for non-5xx status codes', () => {
      expect(isServerError({ status: 200 })).toBe(false)
      expect(isServerError({ status: 400 })).toBe(false)
      expect(isServerError({ status: 401 })).toBe(false)
      expect(isServerError({ status: 429 })).toBe(false)
      expect(isServerError({ status: 499 })).toBe(false)
    })
  })

  describe('getErrorType()', () => {
    it('should return "account" for unauthorized error', () => {
      expect(getErrorType({ status: 401 })).toBe('account')
    })

    it('should return "account" for rate limit error', () => {
      expect(getErrorType({ status: 429 })).toBe('account')
    })

    it('should return "client" for client errors', () => {
      expect(getErrorType({ status: 400 })).toBe('client')
      expect(getErrorType({ status: 415 })).toBe('client')
    })

    it('should return "server" for server errors', () => {
      expect(getErrorType({ status: 500 })).toBe('server')
      expect(getErrorType({ status: 502 })).toBe('server')
      expect(getErrorType({ status: 503 })).toBe('server')
    })

    it('should return "unknown" for other errors', () => {
      expect(getErrorType({ status: 200 })).toBe('unknown')
      expect(getErrorType({ status: 300 })).toBe('unknown')
      expect(getErrorType({ status: 404 })).toBe('unknown')
      expect(getErrorType({})).toBe('unknown')
    })

    it('should prioritize account errors over others', () => {
      // 401 should be account, not unknown
      expect(getErrorType({ status: 401 })).toBe('account')
      // 429 should be account, not client
      expect(getErrorType({ status: 429 })).toBe('account')
    })
  })

  describe('getErrorMessage()', () => {
    it('should return Chinese message for unauthorized error', () => {
      expect(getErrorMessage({ status: 401 })).toBe('API Key 无效')
    })

    it('should return Chinese message for rate limit error', () => {
      expect(getErrorMessage({ status: 429 })).toBe('API Key 已达到月度限制')
    })

    it('should return Chinese message for client errors', () => {
      expect(getErrorMessage({ status: 400 })).toBe('请求错误，请检查输入图片格式')
      expect(getErrorMessage({ status: 415 })).toBe('请求错误，请检查输入图片格式')
    })

    it('should return Chinese message for server errors', () => {
      expect(getErrorMessage({ status: 500 })).toBe('TinyPNG 服务器错误，稍后重试')
      expect(getErrorMessage({ status: 502 })).toBe('TinyPNG 服务器错误，稍后重试')
      expect(getErrorMessage({ status: 503 })).toBe('TinyPNG 服务器错误，稍后重试')
    })

    it('should return generic message for unknown errors', () => {
      const error = { status: 404, statusText: 'Not Found' }
      expect(getErrorMessage(error)).toBe('HTTP 404: Not Found')
    })

    it('should handle errors without statusText', () => {
      const error = { status: 999 }
      const message = getErrorMessage(error)
      // 999 is >= 500, so it's treated as a server error
      expect(message).toBe('TinyPNG 服务器错误，稍后重试')
    })

    it('should prioritize specific messages over generic ones', () => {
      // Should not use generic HTTP message for known errors
      expect(getErrorMessage({ status: 401 })).not.toContain('HTTP')
      expect(getErrorMessage({ status: 429 })).not.toContain('HTTP')
      expect(getErrorMessage({ status: 400 })).not.toContain('HTTP')
      expect(getErrorMessage({ status: 500 })).not.toContain('HTTP')
    })
  })

  describe('shouldMarkKeyError()', () => {
    it('should return true for unauthorized error', () => {
      expect(shouldMarkKeyError({ status: 401 })).toBe(true)
    })

    it('should return true for rate limit error', () => {
      expect(shouldMarkKeyError({ status: 429 })).toBe(true)
    })

    it('should return false for client errors', () => {
      expect(shouldMarkKeyError({ status: 400 })).toBe(false)
      expect(shouldMarkKeyError({ status: 415 })).toBe(false)
    })

    it('should return false for server errors', () => {
      expect(shouldMarkKeyError({ status: 500 })).toBe(false)
      expect(shouldMarkKeyError({ status: 502 })).toBe(false)
      expect(shouldMarkKeyError({ status: 503 })).toBe(false)
    })

    it('should return false for other errors', () => {
      expect(shouldMarkKeyError({ status: 200 })).toBe(false)
      expect(shouldMarkKeyError({ status: 404 })).toBe(false)
      expect(shouldMarkKeyError({})).toBe(false)
    })

    it('should only mark account-related errors', () => {
      // Only 401 and 429 should mark key as errored
      const accountErrors = [401, 429]
      const otherErrors = [400, 403, 404, 415, 500, 502, 503]

      accountErrors.forEach(status => {
        expect(shouldMarkKeyError({ status })).toBe(true)
      })

      otherErrors.forEach(status => {
        expect(shouldMarkKeyError({ status })).toBe(false)
      })
    })
  })

  describe('calculateRetryDelay()', () => {
    it('should calculate retry delay with linear backoff', () => {
      expect(calculateRetryDelay(0)).toBe(1000) // First retry: 1s
      expect(calculateRetryDelay(1)).toBe(2000) // Second retry: 2s
      expect(calculateRetryDelay(2)).toBe(3000) // Third retry: 3s
      expect(calculateRetryDelay(3)).toBe(4000) // Fourth retry: 4s
    })

    it('should handle attempt 0', () => {
      expect(calculateRetryDelay(0)).toBe(1000)
    })

    it('should increase delay with each attempt', () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const delay = calculateRetryDelay(attempt)
        expect(delay).toBe(1000 * (attempt + 1))

        if (attempt > 0) {
          const prevDelay = calculateRetryDelay(attempt - 1)
          expect(delay).toBeGreaterThan(prevDelay)
        }
      }
    })

    it('should handle large attempt numbers', () => {
      expect(calculateRetryDelay(10)).toBe(11000)
      expect(calculateRetryDelay(100)).toBe(101000)
    })

    it('should always return positive values', () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        expect(calculateRetryDelay(attempt)).toBeGreaterThan(0)
      }
    })

    it('should use milliseconds as unit', () => {
      // All values should be multiples of 1000
      for (let attempt = 0; attempt < 10; attempt++) {
        expect(calculateRetryDelay(attempt) % 1000).toBe(0)
      }
    })
  })

  describe('Error classification integration', () => {
    it('should correctly classify and handle common API errors', () => {
      const testCases = [
        {
          status: 401,
          shouldRetry: false,
          shouldMarkKey: true,
          type: 'account',
          messageContains: 'API Key',
        },
        {
          status: 429,
          shouldRetry: false,
          shouldMarkKey: true,
          type: 'account',
          messageContains: '月度限制',
        },
        {
          status: 400,
          shouldRetry: false,
          shouldMarkKey: false,
          type: 'client',
          messageContains: '请求错误',
        },
        {
          status: 500,
          shouldRetry: false,
          shouldMarkKey: false,
          type: 'server',
          messageContains: '服务器错误',
        },
      ]

      testCases.forEach(({ status, shouldMarkKey: expectMarkKey, type, messageContains }) => {
        const error = { status }

        expect(getErrorType(error)).toBe(type)
        expect(shouldMarkKeyError(error)).toBe(expectMarkKey)
        expect(getErrorMessage(error)).toContain(messageContains)
      })
    })

    it('should handle network errors differently from HTTP errors', () => {
      const networkError = { cause: { code: 'ECONNREFUSED' } }
      const httpError = { status: 500 }

      expect(shouldRetryOnNetworkError(networkError)).toBe(true)
      expect(shouldRetryOnNetworkError(httpError)).toBe(false)

      expect(isServerError(networkError)).toBe(false)
      expect(isServerError(httpError)).toBe(true)
    })
  })
})
