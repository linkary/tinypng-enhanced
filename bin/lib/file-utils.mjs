/**
 * File operations for TinyPNG CLI
 */

import { existsSync, statSync, readdirSync, mkdirSync } from 'node:fs'
import { join, basename, extname, dirname, resolve } from 'node:path'
import chalk from 'chalk'
import { isUrl, getFilenameFromUrl } from '../../src/utils/url.mjs'

// Supported image extensions
export const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif']

/**
 * Recursively scan directory for image files with depth limit
 * @param {string} dir - Directory to scan
 * @param {number} currentDepth - Current depth level
 * @param {number} maxDepth - Maximum depth to scan
 * @returns {string[]} Array of file paths
 */
export function scanDirectory(dir, currentDepth = 1, maxDepth = 1) {
  const files = []

  if (currentDepth > maxDepth) {
    return files
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // Recursively scan subdirectories if within depth limit
        if (currentDepth < maxDepth) {
          files.push(...scanDirectory(fullPath, currentDepth + 1, maxDepth))
        }
      } else if (entry.isFile() && SUPPORTED_EXTENSIONS.includes(extname(entry.name).toLowerCase())) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(chalk.yellow(`⚠️  Warning: Could not read directory ${dir}: ${error.message}`))
  }

  return files
}

/**
 * Expand file patterns to actual file paths (or URLs)
 * @param {string[]} patterns - File or directory patterns or URLs
 * @param {number} depth - Maximum directory scan depth (default: 1)
 * @returns {string[]} Array of file paths or URLs
 */
export function expandFiles(patterns, depth = 1) {
  const files = new Set()

  for (const pattern of patterns) {
    // Check if it's a URL
    if (isUrl(pattern)) {
      files.add(pattern)
      continue
    }

    // Check if it's a directory
    if (existsSync(pattern) && statSync(pattern).isDirectory()) {
      // Scan directory with specified depth
      scanDirectory(pattern, 1, depth).forEach(f => files.add(resolve(f)))
    } else if (existsSync(pattern)) {
      // Single file
      if (SUPPORTED_EXTENSIONS.includes(extname(pattern).toLowerCase())) {
        files.add(resolve(pattern))
      }
    }
  }

  return Array.from(files)
}

/**
 * Get output path for a file
 */
export function getOutputPath(inputPath, options) {
  if (options.overwrite) {
    return inputPath
  }

  const dir = dirname(inputPath)
  const ext = extname(inputPath)
  const base = basename(inputPath, ext)

  if (options.output) {
    // Check if output is a directory or file
    if (
      options.output.endsWith('/') ||
      (existsSync(options.output) && statSync(options.output).isDirectory())
    ) {
      return join(options.output, `${base}${ext}`)
    }
    // Single file mode
    return options.output
  }

  // Default: output/ directory relative to input file's directory
  const outputDir = join(dir, 'output')
  return join(outputDir, `${base}${ext}`)
}

/**
 * Get display name for progress bar (relative path if in subdirectory)
 * @param {string} filePath - Full file path or URL
 * @param {string} baseDir - Base directory for relative path calculation
 * @returns {string} Display name for progress bar
 */
export function getDisplayName(filePath, baseDir) {
  // If it's a URL, return the filename from URL
  if (isUrl(filePath)) {
    return getFilenameFromUrl(filePath)
  }

  // If baseDir is provided and is a directory, show relative path
  if (baseDir && existsSync(baseDir) && statSync(baseDir).isDirectory()) {
    // Resolve both paths to absolute and then get relative
    const absoluteBase = resolve(baseDir)
    const absoluteFile = resolve(filePath)

    // If file is under baseDir, return relative path
    if (absoluteFile.startsWith(absoluteBase)) {
      const relativePath = absoluteFile.substring(absoluteBase.length).replace(/^[/\\]/, '')
      return relativePath || basename(filePath)
    }
  }

  // Fallback: make path relative to current working directory
  const cwd = process.cwd()
  const absoluteFile = resolve(filePath)

  if (absoluteFile.startsWith(cwd)) {
    return absoluteFile.substring(cwd.length).replace(/^[/\\]/, '')
  }

  return basename(filePath)
}

/**
 * Get output path for convert operation
 */
export function getConvertOutputPath(inputPath, options) {
  const isUrlInput = isUrl(inputPath)
  const ext = options.format.startsWith('.') ? options.format : `.${options.format}`

  if (options.overwrite) {
    return inputPath
  }

  let base
  if (isUrlInput) {
    try {
      const url = new URL(inputPath)
      base = basename(url.pathname, extname(url.pathname))
    } catch {
      base = 'image'
    }
  } else {
    base = basename(inputPath, extname(inputPath))
  }

  if (options.output) {
    if (
      options.output.endsWith('/') ||
      (existsSync(options.output) && statSync(options.output).isDirectory())
    ) {
      return join(options.output, `${base}${ext}`)
    }
    return options.output
  }

  // Default: output/ directory relative to input file's directory
  if (!isUrlInput) {
    const dir = dirname(inputPath)
    const outputDir = join(dir, 'output')
    return join(outputDir, `${base}${ext}`)
  }

  // For URLs, use current directory
  return join(process.cwd(), 'output', `${base}${ext}`)
}

/**
 * Ensure directory exists
 */
export function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}
