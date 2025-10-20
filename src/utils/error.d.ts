/**
 * Error handling utilities for TinyPNG API
 */

/**
 * Check if error should trigger retry
 * @param error - Error object
 * @returns True if should retry
 */
export function shouldRetryOnNetworkError(error: Error): boolean

/**
 * Check if error is an unauthorized error (401)
 * @param error - Error object with status property
 * @returns True if unauthorized
 */
export function isUnauthorizedError(error: Error & { status?: number }): boolean

/**
 * Check if error is a rate limit error (429)
 * @param error - Error object with status property
 * @returns True if rate limited
 */
export function isRateLimitError(error: Error & { status?: number }): boolean

/**
 * Check if error is a client error (400, 415)
 * @param error - Error object with status property
 * @returns True if client error
 */
export function isClientError(error: Error & { status?: number }): boolean

/**
 * Check if error is a server error (5xx)
 * @param error - Error object with status property
 * @returns True if server error
 */
export function isServerError(error: Error & { status?: number }): boolean

/**
 * Get error type from error status
 * @param error - Error object with status property
 * @returns Error type (account, client, server, unknown)
 */
export function getErrorType(error: Error & { status?: number }): string

/**
 * Get user-friendly error message
 * @param error - Error object with status property
 * @returns User-friendly message in Chinese
 */
export function getErrorMessage(error: Error & { status?: number; statusText?: string }): string

/**
 * Check if error should mark key as errored
 * @param error - Error object with status property
 * @returns True if key should be marked as errored
 */
export function shouldMarkKeyError(error: Error & { status?: number }): boolean

/**
 * Calculate retry delay with exponential backoff
 * @param attempt - Current attempt number (0-based)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attempt: number): number
