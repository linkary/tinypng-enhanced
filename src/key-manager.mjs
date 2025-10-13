import { TINYPNG_API_LIMIT } from './constant.mjs'

/**
 * API Key Manager
 * Handles API key selection, rotation, and usage tracking
 *
 * Features:
 * - Smart key selection (least-used first)
 * - Accurate quota tracking from API responses
 * - Automatic key rotation on errors
 * - Month-aware statistics
 */
export class KeyManager {
  /**
   * @param {Object} options - Configuration options
   * @param {string[]} options.apiKeys - Array of API keys
   * @param {number} [options.monthlyLimit=500] - Compressions per key per month
   */
  constructor(options) {
    if (!options.apiKeys || !Array.isArray(options.apiKeys)) {
      throw new TypeError('apiKeys must be an array')
    }

    if (options.apiKeys.length === 0) {
      throw new Error('至少需要提供一个 API Key')
    }

    this.monthlyLimit = options.monthlyLimit || TINYPNG_API_LIMIT

    // Initialize key statistics
    this.keyStats = options.apiKeys.map((key, index) => ({
      key,
      index,
      compressionCount: null, // null = never used, will get from API
      monthlyLimit: this.monthlyLimit,
      lastUpdated: null, // timestamp of last API response
      lastError: null,
      disabled: false,
    }))

    this.currentKeyIndex = 0
  }

  /**
   * Get the best available API key based on remaining quota
   * Uses least-used strategy to maximize total throughput
   * @returns {Object} Key statistics object
   * @throws {Error} If no keys are available
   */
  selectBestKey() {
    // Get all non-disabled keys
    const availableKeys = this.keyStats.filter(stat => !stat.disabled)

    if (availableKeys.length === 0) {
      throw new Error('所有 API Keys 都已被禁用')
    }

    // Filter out keys we know are at limit
    const viableKeys = availableKeys.filter(stat => {
      // Unknown count = assume available
      if (stat.compressionCount === null) return true
      // Check if under limit
      return stat.compressionCount < stat.monthlyLimit
    })

    if (viableKeys.length === 0) {
      throw new Error('所有 API Keys 都已达到月度限制')
    }

    // Select key with most remaining quota (least-used strategy)
    const bestKey = viableKeys.reduce((best, current) => {
      const bestRemaining =
        best.compressionCount === null
          ? Infinity // Unknown = highest priority
          : best.monthlyLimit - best.compressionCount

      const currentRemaining =
        current.compressionCount === null ? Infinity : current.monthlyLimit - current.compressionCount

      return currentRemaining > bestRemaining ? current : best
    })

    this.currentKeyIndex = bestKey.index

    return bestKey
  }

  /**
   * Update key statistics from API response
   * @param {number} keyIndex - Index of the key
   * @param {number} compressionCount - Compression count from API header
   */
  updateStats(keyIndex, compressionCount) {
    const stat = this.keyStats[keyIndex]

    if (!stat) {
      throw new Error(`Invalid key index: ${keyIndex}`)
    }

    if (typeof compressionCount === 'number') {
      stat.compressionCount = compressionCount
      stat.lastUpdated = Date.now()

      // Auto-disable if at limit
      if (compressionCount >= stat.monthlyLimit) {
        stat.disabled = true
      }
    }
  }

  /**
   * Mark a key as having an error and disable it
   * @param {number} keyIndex - Index of the key
   * @param {Error} error - Error object
   */
  markKeyError(keyIndex, error) {
    const stat = this.keyStats[keyIndex]

    if (!stat) {
      throw new Error(`Invalid key index: ${keyIndex}`)
    }

    stat.lastError = error
    stat.disabled = true
  }

  /**
   * Get the current key being used
   * @returns {Object} Current key statistics
   */
  getCurrentKey() {
    return this.keyStats[this.currentKeyIndex]
  }

  /**
   * Get all key statistics
   * @returns {Array<Object>} Array of key statistics
   */
  getStats() {
    return this.keyStats.map(stat => ({
      keyIndex: stat.index,
      compressionCount: stat.compressionCount,
      monthlyLimit: stat.monthlyLimit,
      remaining:
        stat.compressionCount === null
          ? null // Never used
          : stat.monthlyLimit - stat.compressionCount,
      percentUsed:
        stat.compressionCount === null
          ? null
          : ((stat.compressionCount / stat.monthlyLimit) * 100).toFixed(2),
      lastUpdated: stat.lastUpdated,
      disabled: stat.disabled,
      lastError: stat.lastError ? stat.lastError.message : null,
    }))
  }

  /**
   * Get summary statistics across all keys
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const stats = this.keyStats

    const total = stats.length
    const disabled = stats.filter(s => s.disabled).length
    const active = total - disabled
    const unknown = stats.filter(s => s.compressionCount === null).length

    const knownStats = stats.filter(s => s.compressionCount !== null)
    const totalUsed = knownStats.reduce((sum, s) => sum + s.compressionCount, 0)
    const totalLimit = knownStats.reduce((sum, s) => sum + s.monthlyLimit, 0)
    const totalRemaining = knownStats.reduce(
      (sum, s) => sum + Math.max(0, s.monthlyLimit - s.compressionCount),
      0
    )

    return {
      totalKeys: total,
      activeKeys: active,
      disabledKeys: disabled,
      unknownKeys: unknown,
      totalUsed: knownStats.length > 0 ? totalUsed : null,
      totalLimit: knownStats.length > 0 ? totalLimit : null,
      totalRemaining: knownStats.length > 0 ? totalRemaining : null,
      percentUsed:
        knownStats.length > 0 && totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(2) : null,
    }
  }

  /**
   * Reset all statistics (e.g., for new month)
   * Re-enables all keys and clears counts
   */
  reset() {
    this.keyStats.forEach(stat => {
      stat.compressionCount = null
      stat.disabled = false
      stat.lastError = null
      stat.lastUpdated = null
    })

    this.currentKeyIndex = 0
  }

  /**
   * Get total number of keys
   * @returns {number} Total number of keys
   */
  getTotalKeys() {
    return this.keyStats.length
  }

  /**
   * Check if a specific key is available
   * @param {number} keyIndex - Index of the key
   * @returns {boolean} True if key is available
   */
  isKeyAvailable(keyIndex) {
    const stat = this.keyStats[keyIndex]

    if (!stat || stat.disabled) return false

    // Unknown count = assume available
    if (stat.compressionCount === null) return true

    // Check if under limit
    return stat.compressionCount < stat.monthlyLimit
  }

  /**
   * Get the API key string by index
   * @param {number} keyIndex - Index of the key
   * @returns {string} API key string
   */
  getKeyString(keyIndex) {
    const stat = this.keyStats[keyIndex]

    if (!stat) {
      throw new Error(`Invalid key index: ${keyIndex}`)
    }

    return stat.key
  }
}
