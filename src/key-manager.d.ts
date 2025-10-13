/**
 * Key statistics object
 */
export interface KeyStat {
  /** API key string */
  key: string
  /** Index of the key */
  index: number
  /** Number of compressions used (null if never used) */
  compressionCount: number | null
  /** Monthly limit for this key */
  monthlyLimit: number
  /** Timestamp of last update from API */
  lastUpdated: number | null
  /** Last error encountered */
  lastError: Error | null
  /** Whether this key is disabled */
  disabled: boolean
}

/**
 * Public key statistics (safe to expose)
 */
export interface PublicKeyStat {
  /** Index of the key */
  keyIndex: number
  /** Number of compressions used (null if never used) */
  compressionCount: number | null
  /** Monthly limit for this key */
  monthlyLimit: number
  /** Remaining compressions (null if never used) */
  remaining: number | null
  /** Percentage used (null if never used) */
  percentUsed: string | null
  /** Timestamp of last update */
  lastUpdated: number | null
  /** Whether this key is disabled */
  disabled: boolean
  /** Last error message (if any) */
  lastError: string | null
}

/**
 * Summary statistics across all keys
 */
export interface KeySummary {
  /** Total number of keys */
  totalKeys: number
  /** Number of active keys */
  activeKeys: number
  /** Number of disabled keys */
  disabledKeys: number
  /** Number of keys with unknown usage */
  unknownKeys: number
  /** Total compressions used (null if all unknown) */
  totalUsed: number | null
  /** Total monthly limit (null if all unknown) */
  totalLimit: number | null
  /** Total remaining compressions (null if all unknown) */
  totalRemaining: number | null
  /** Overall percentage used (null if all unknown) */
  percentUsed: string | null
}

/**
 * KeyManager constructor options
 */
export interface KeyManagerOptions {
  /** Array of API keys */
  apiKeys: string[]
  /** Monthly limit per key (default: 500) */
  monthlyLimit?: number
}

/**
 * API Key Manager
 * Handles API key selection, rotation, and usage tracking
 */
export class KeyManager {
  /**
   * Monthly limit per key
   */
  readonly monthlyLimit: number

  /**
   * Key statistics (internal)
   */
  private keyStats: KeyStat[]

  /**
   * Current key index
   */
  private currentKeyIndex: number

  /**
   * Create a new KeyManager
   * @param options - Configuration options
   */
  constructor(options: KeyManagerOptions)

  /**
   * Get the best available API key based on remaining quota
   * Uses least-used strategy to maximize total throughput
   * @returns Key statistics object
   * @throws {Error} If no keys are available
   */
  selectBestKey(): KeyStat

  /**
   * Update key statistics from API response
   * @param keyIndex - Index of the key
   * @param compressionCount - Compression count from API header
   */
  updateStats(keyIndex: number, compressionCount: number): void

  /**
   * Mark a key as having an error and disable it
   * @param keyIndex - Index of the key
   * @param error - Error object
   */
  markKeyError(keyIndex: number, error: Error): void

  /**
   * Get the current key being used
   * @returns Current key statistics
   */
  getCurrentKey(): KeyStat

  /**
   * Get all key statistics
   * @returns Array of key statistics
   */
  getStats(): PublicKeyStat[]

  /**
   * Get summary statistics across all keys
   * @returns Summary statistics
   */
  getSummary(): KeySummary

  /**
   * Reset all statistics (e.g., for new month)
   * Re-enables all keys and clears counts
   */
  reset(): void

  /**
   * Get total number of keys
   * @returns Total number of keys
   */
  getTotalKeys(): number

  /**
   * Check if a specific key is available
   * @param keyIndex - Index of the key
   * @returns True if key is available
   */
  isKeyAvailable(keyIndex: number): boolean

  /**
   * Get the API key string by index
   * @param keyIndex - Index of the key
   * @returns API key string
   */
  getKeyString(keyIndex: number): string
}
