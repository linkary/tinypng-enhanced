import { describe, it, expect, beforeEach } from 'vitest'
import { KeyManager } from './key-manager.mjs'

describe('KeyManager', () => {
  describe('Constructor', () => {
    it('should create instance with single API key', () => {
      const keyManager = new KeyManager({
        apiKeys: ['test-key-1'],
        monthlyLimit: 500,
      })

      expect(keyManager.getTotalKeys()).toBe(1)
      expect(keyManager.monthlyLimit).toBe(500)
    })

    it('should create instance with multiple API keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      expect(keyManager.getTotalKeys()).toBe(3)
    })

    it('should use default monthly limit if not provided', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
      })

      expect(keyManager.monthlyLimit).toBe(500)
    })

    it('should throw TypeError if apiKeys is not an array', () => {
      expect(() => new KeyManager({ apiKeys: 'not-an-array' })).toThrow(TypeError)
    })

    it('should throw TypeError if apiKeys is missing', () => {
      expect(() => new KeyManager({})).toThrow(TypeError)
    })

    it('should throw Error if apiKeys array is empty', () => {
      expect(() => new KeyManager({ apiKeys: [] })).toThrow('至少需要提供一个 API Key')
    })

    it('should initialize compression counts as null', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })

      const stats = keyManager.getStats()
      expect(stats[0].compressionCount).toBeNull()
      expect(stats[1].compressionCount).toBeNull()
    })
  })

  describe('selectBestKey()', () => {
    it('should select first key initially (when all unknown)', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
      })

      const selected = keyManager.selectBestKey()
      expect(selected.index).toBe(0)
      expect(selected.key).toBe('key1')
    })

    it('should prefer key with more remaining quota', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      // Simulate usage
      keyManager.updateStats(0, 450) // Key 1: 50 remaining
      keyManager.updateStats(1, 100) // Key 2: 400 remaining
      keyManager.updateStats(2, 300) // Key 3: 200 remaining

      const selected = keyManager.selectBestKey()
      expect(selected.index).toBe(1) // Key 2 has most remaining
    })

    it('should prefer unknown keys over known keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      // Key 1 has been used
      keyManager.updateStats(0, 50) // Key 1: 450 remaining

      // Key 2 and 3 are unknown (null)
      const selected = keyManager.selectBestKey()
      // Should select unknown key (2 or 3), not key 1
      expect([1, 2]).toContain(selected.index)
    })

    it('should skip disabled keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
      })

      // Disable key 1
      keyManager.markKeyError(0, new Error('Test error'))

      const selected = keyManager.selectBestKey()
      expect(selected.index).not.toBe(0)
      expect([1, 2]).toContain(selected.index)
    })

    it('should skip keys at limit', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      // Key 1 and 2 at limit
      keyManager.updateStats(0, 500)
      keyManager.updateStats(1, 500)
      keyManager.updateStats(2, 100) // Key 3 has 400 remaining

      const selected = keyManager.selectBestKey()
      expect(selected.index).toBe(2)
    })

    it('should throw error if all keys are disabled', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })

      keyManager.markKeyError(0, new Error('Error 1'))
      keyManager.markKeyError(1, new Error('Error 2'))

      expect(() => keyManager.selectBestKey()).toThrow('所有 API Keys 都已被禁用')
    })

    it('should throw error if all keys at limit', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(0, 500)
      keyManager.updateStats(1, 500)

      // When keys reach limit, they are auto-disabled
      expect(() => keyManager.selectBestKey()).toThrow('所有 API Keys 都已被禁用')
    })
  })

  describe('updateStats()', () => {
    let keyManager

    beforeEach(() => {
      keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })
    })

    it('should update compression count', () => {
      keyManager.updateStats(0, 100)

      const stats = keyManager.getStats()
      expect(stats[0].compressionCount).toBe(100)
    })

    it('should update lastUpdated timestamp', () => {
      const before = Date.now()
      keyManager.updateStats(0, 100)
      const after = Date.now()

      const stats = keyManager.getStats()
      expect(stats[0].lastUpdated).toBeGreaterThanOrEqual(before)
      expect(stats[0].lastUpdated).toBeLessThanOrEqual(after)
    })

    it('should auto-disable key when at limit', () => {
      keyManager.updateStats(0, 500)

      const stats = keyManager.getStats()
      expect(stats[0].disabled).toBe(true)
    })

    it('should auto-disable key when over limit', () => {
      keyManager.updateStats(0, 550)

      const stats = keyManager.getStats()
      expect(stats[0].disabled).toBe(true)
    })

    it('should not disable key when under limit', () => {
      keyManager.updateStats(0, 499)

      const stats = keyManager.getStats()
      expect(stats[0].disabled).toBe(false)
    })

    it('should throw error for invalid key index', () => {
      expect(() => keyManager.updateStats(10, 100)).toThrow('Invalid key index: 10')
    })

    it('should handle null compression count', () => {
      keyManager.updateStats(0, null)

      const stats = keyManager.getStats()
      expect(stats[0].compressionCount).toBeNull()
      expect(stats[0].lastUpdated).toBeNull()
    })
  })

  describe('markKeyError()', () => {
    let keyManager

    beforeEach(() => {
      keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })
    })

    it('should mark key as disabled', () => {
      keyManager.markKeyError(0, new Error('Test error'))

      const stats = keyManager.getStats()
      expect(stats[0].disabled).toBe(true)
    })

    it('should store error message', () => {
      keyManager.markKeyError(0, new Error('Test error'))

      const stats = keyManager.getStats()
      expect(stats[0].lastError).toBe('Test error')
    })

    it('should throw error for invalid key index', () => {
      expect(() => keyManager.markKeyError(10, new Error('Test'))).toThrow('Invalid key index: 10')
    })
  })

  describe('getCurrentKey()', () => {
    it('should return first key initially', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })

      const current = keyManager.getCurrentKey()
      expect(current.index).toBe(0)
      expect(current.key).toBe('key1')
    })

    it('should return selected key after selection', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(0, 450) // Key 0: 50 remaining
      keyManager.updateStats(1, 100) // Key 1: 400 remaining
      keyManager.updateStats(2, 300) // Key 2: 200 remaining

      keyManager.selectBestKey() // Should select key 1 (most remaining among known)

      const current = keyManager.getCurrentKey()
      expect(current.index).toBe(1)
    })
  })

  describe('getStats()', () => {
    it('should return stats for all keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      const stats = keyManager.getStats()
      expect(stats).toHaveLength(3)
      expect(stats[0].keyIndex).toBe(0)
      expect(stats[1].keyIndex).toBe(1)
      expect(stats[2].keyIndex).toBe(2)
    })

    it('should return null remaining for unused keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
      })

      const stats = keyManager.getStats()
      expect(stats[0].remaining).toBeNull()
      expect(stats[0].percentUsed).toBeNull()
    })

    it('should calculate remaining correctly', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(0, 100)

      const stats = keyManager.getStats()
      expect(stats[0].remaining).toBe(400)
    })

    it('should calculate percentUsed correctly', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(0, 250)

      const stats = keyManager.getStats()
      expect(stats[0].percentUsed).toBe('50.00')
    })

    it('should not expose API keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['secret-key-1'],
      })

      const stats = keyManager.getStats()
      expect(stats[0]).not.toHaveProperty('key')
    })
  })

  describe('getSummary()', () => {
    it('should return summary for all keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      const summary = keyManager.getSummary()
      expect(summary.totalKeys).toBe(3)
      expect(summary.activeKeys).toBe(3)
      expect(summary.disabledKeys).toBe(0)
    })

    it('should count disabled keys correctly', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
      })

      keyManager.markKeyError(0, new Error('Error'))
      keyManager.markKeyError(1, new Error('Error'))

      const summary = keyManager.getSummary()
      expect(summary.activeKeys).toBe(1)
      expect(summary.disabledKeys).toBe(2)
    })

    it('should count unknown keys correctly', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
      })

      keyManager.updateStats(0, 100)
      // Key 1 and 2 still unknown

      const summary = keyManager.getSummary()
      expect(summary.unknownKeys).toBe(2)
    })

    it('should calculate total usage correctly', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(0, 100)
      keyManager.updateStats(1, 200)
      keyManager.updateStats(2, 150)

      const summary = keyManager.getSummary()
      expect(summary.totalUsed).toBe(450)
      expect(summary.totalLimit).toBe(1500)
      expect(summary.totalRemaining).toBe(1050)
    })

    it('should return null for all-unknown keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })

      const summary = keyManager.getSummary()
      expect(summary.totalUsed).toBeNull()
      expect(summary.totalLimit).toBeNull()
      expect(summary.totalRemaining).toBeNull()
      expect(summary.percentUsed).toBeNull()
    })

    it('should calculate percentUsed correctly', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(0, 250)
      keyManager.updateStats(1, 250)

      const summary = keyManager.getSummary()
      expect(summary.percentUsed).toBe('50.00')
    })
  })

  describe('reset()', () => {
    it('should reset all compression counts to null', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })

      keyManager.updateStats(0, 100)
      keyManager.updateStats(1, 200)

      keyManager.reset()

      const stats = keyManager.getStats()
      expect(stats[0].compressionCount).toBeNull()
      expect(stats[1].compressionCount).toBeNull()
    })

    it('should re-enable all disabled keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
      })

      keyManager.markKeyError(0, new Error('Error'))
      keyManager.markKeyError(1, new Error('Error'))

      keyManager.reset()

      const stats = keyManager.getStats()
      expect(stats[0].disabled).toBe(false)
      expect(stats[1].disabled).toBe(false)
    })

    it('should clear error messages', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
      })

      keyManager.markKeyError(0, new Error('Test error'))

      keyManager.reset()

      const stats = keyManager.getStats()
      expect(stats[0].lastError).toBeNull()
    })

    it('should reset lastUpdated timestamps', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
      })

      keyManager.updateStats(0, 100)

      keyManager.reset()

      const stats = keyManager.getStats()
      expect(stats[0].lastUpdated).toBeNull()
    })

    it('should reset currentKeyIndex to 0', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      keyManager.updateStats(1, 100)
      keyManager.selectBestKey() // Selects key 1

      keyManager.reset()

      const current = keyManager.getCurrentKey()
      expect(current.index).toBe(0)
    })
  })

  describe('isKeyAvailable()', () => {
    let keyManager

    beforeEach(() => {
      keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })
    })

    it('should return true for unknown keys', () => {
      expect(keyManager.isKeyAvailable(0)).toBe(true)
    })

    it('should return true for keys under limit', () => {
      keyManager.updateStats(0, 100)

      expect(keyManager.isKeyAvailable(0)).toBe(true)
    })

    it('should return false for disabled keys', () => {
      keyManager.markKeyError(0, new Error('Error'))

      expect(keyManager.isKeyAvailable(0)).toBe(false)
    })

    it('should return false for keys at limit', () => {
      keyManager.updateStats(0, 500)

      expect(keyManager.isKeyAvailable(0)).toBe(false)
    })

    it('should return false for keys over limit', () => {
      keyManager.updateStats(0, 550)

      expect(keyManager.isKeyAvailable(0)).toBe(false)
    })

    it('should return false for invalid key index', () => {
      expect(keyManager.isKeyAvailable(10)).toBe(false)
    })
  })

  describe('getKeyString()', () => {
    it('should return the API key string', () => {
      const keyManager = new KeyManager({
        apiKeys: ['secret-key-1', 'secret-key-2'],
      })

      expect(keyManager.getKeyString(0)).toBe('secret-key-1')
      expect(keyManager.getKeyString(1)).toBe('secret-key-2')
    })

    it('should throw error for invalid key index', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1'],
      })

      expect(() => keyManager.getKeyString(10)).toThrow('Invalid key index: 10')
    })
  })

  describe('getTotalKeys()', () => {
    it('should return total number of keys', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
      })

      expect(keyManager.getTotalKeys()).toBe(3)
    })
  })

  describe('Integration: Realistic Usage Scenario', () => {
    it('should handle typical compression workflow', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      // First compression: all keys unknown, selects first
      let key = keyManager.selectBestKey()
      expect(key.index).toBe(0)

      // API returns count after compression
      keyManager.updateStats(0, 1)

      // Second compression: still prefers unknown keys
      key = keyManager.selectBestKey()
      expect([1, 2]).toContain(key.index)

      // Update all keys
      keyManager.updateStats(0, 50)
      keyManager.updateStats(1, 100)
      keyManager.updateStats(2, 300)

      // Should now select key with most remaining (key 0: 450 remaining)
      key = keyManager.selectBestKey()
      expect(key.index).toBe(0)

      // Simulate key 0 hitting limit
      keyManager.updateStats(0, 500)

      // Should now select key 1 (400 remaining) over key 2 (200 remaining)
      key = keyManager.selectBestKey()
      expect(key.index).toBe(1)
    })

    it('should handle error scenarios', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2', 'key3'],
        monthlyLimit: 500,
      })

      // Key 1 gets 401 error (invalid)
      const key1 = keyManager.selectBestKey()
      keyManager.markKeyError(key1.index, new Error('401 Unauthorized'))

      // Should select different key
      const key2 = keyManager.selectBestKey()
      expect(key2.index).not.toBe(key1.index)

      // Key 2 gets 429 error (rate limit)
      keyManager.markKeyError(key2.index, new Error('429 Too Many Requests'))

      // Should select third key
      const key3 = keyManager.selectBestKey()
      expect(key3.index).not.toBe(key1.index)
      expect(key3.index).not.toBe(key2.index)

      // All keys disabled
      keyManager.markKeyError(key3.index, new Error('Error'))

      // Should throw
      expect(() => keyManager.selectBestKey()).toThrow('所有 API Keys 都已被禁用')
    })

    it('should handle month rollover with reset', () => {
      const keyManager = new KeyManager({
        apiKeys: ['key1', 'key2'],
        monthlyLimit: 500,
      })

      // Use up keys
      keyManager.updateStats(0, 500)
      keyManager.updateStats(1, 500)

      // Can't select any key
      expect(() => keyManager.selectBestKey()).toThrow()

      // Month rolls over, reset counts
      keyManager.reset()

      // Should work again
      const key = keyManager.selectBestKey()
      expect([0, 1]).toContain(key.index)
    })
  })
})
