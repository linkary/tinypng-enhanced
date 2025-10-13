import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'

/**
 * TinyPNG compressor options
 */
export interface TinyPNGOptions {
  /** Single API key or array of API keys */
  apiKey: string | string[]
  /** Compressions per key per month (default: 500) */
  compressionCount?: number
}

/**
 * Resize options for compression
 */
export interface ResizeOptions {
  /** Resize method */
  method?: 'scale' | 'fit' | 'cover' | 'thumb'
  /** Target width */
  width?: number
  /** Target height */
  height?: number
}

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Resize options */
  resize?: ResizeOptions
}

/**
 * API key statistics
 */
export interface KeyStats {
  /** Key index */
  keyIndex: number
  /** Number of compressions used */
  compressionCount: number
  /** Monthly limit */
  monthlyLimit: number
  /** Remaining compressions */
  remaining: number
  /** Whether the key is disabled */
  disabled: boolean
  /** Last error message if any */
  lastError: string | null
}

/**
 * Compression result for file output
 */
export interface CompressionFileResult {
  /** Output file path */
  outputPath: string
  /** Compressed file size */
  size: number
}

/**
 * TinyPNG compressor events
 */
export interface TinyPNGEvents {
  init: [data: { totalKeys: number; keysConfigured: string[] }]
  keySwitch: [data: { keyIndex: number; compressionCount: number; monthlyLimit: number }]
  keyError: [data: { keyIndex: number; error: string }]
  start: [data: { type: 'file' | 'stream' | 'buffer'; filename?: string; size?: number }]
  compressing: [data: { keyIndex: number; attempt: number; maxRetries: number }]
  success: [
    data: {
      keyIndex: number
      originalSize: number
      compressedSize: number
      savedBytes: number
      compressionRatio: string
      filename?: string
    }
  ]
  error: [data: { type: string; keyIndex?: number; message?: string; error: Error }]
  reset: [data: { message: string }]
}

/**
 * TinyPNG Compressor with multiple API key support
 */
export default class TinyPNGCompressor extends EventEmitter {
  /** Array of API keys */
  apiKeys: string[]

  /** Statistics for each API key */
  keyStats: Array<{
    key: string
    index: number
    compressionCount: number
    monthlyLimit: number
    lastError: Error | null
    disabled: boolean
  }>

  /** Current key index being used */
  currentKeyIndex: number

  /**
   * Create a new TinyPNG compressor
   * @param options - Configuration options
   */
  constructor(options: TinyPNGOptions)

  /**
   * Compress a file or buffer
   * @param source - File path, buffer, or readable stream
   * @param options - Compression options
   * @returns Compressed image buffer
   */
  compress(source: string | Buffer | Readable, options?: CompressionOptions): Promise<Buffer>

  /**
   * Compress and save to file
   * @param source - File path, buffer, or stream
   * @param outputPath - Output file path
   * @param options - Compression options
   * @returns Compression result with file info
   */
  compressToFile(
    source: string | Buffer | Readable,
    outputPath: string,
    options?: CompressionOptions
  ): Promise<CompressionFileResult>

  /**
   * Get compression stats for all API keys
   * @returns Stats for each API key
   */
  getStats(): KeyStats[]

  /**
   * Reset compression counts (call at the start of each month)
   */
  resetCounts(): void

  // EventEmitter type augmentation
  on<K extends keyof TinyPNGEvents>(event: K, listener: (...args: TinyPNGEvents[K]) => void): this

  once<K extends keyof TinyPNGEvents>(event: K, listener: (...args: TinyPNGEvents[K]) => void): this

  emit<K extends keyof TinyPNGEvents>(event: K, ...args: TinyPNGEvents[K]): boolean

  off<K extends keyof TinyPNGEvents>(event: K, listener: (...args: TinyPNGEvents[K]) => void): this

  removeListener<K extends keyof TinyPNGEvents>(event: K, listener: (...args: TinyPNGEvents[K]) => void): this
}
