/**
 * File processors for TinyPNG CLI
 * Handles individual file processing with progress tracking
 */

import { statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import chalk from 'chalk'
import cliProgress from 'cli-progress'
import TinyPNGCompressor from '../../src/tinypng.mjs'
import { formatSize } from '../../src/utils/compression.mjs'
import { isUrl } from '../../src/utils/url.mjs'
import { getDisplayName, getOutputPath, getConvertOutputPath } from './file-utils.mjs'

/**
 * Process a single file or URL compression with individual progress bar
 */
export async function processSingleFile(
  inputPath,
  outputPath,
  options,
  apiKeys,
  multiBar,
  results,
  baseDir,
  sharedCompressor = null
) {
  const displayName = getDisplayName(inputPath, baseDir)
  const isUrlInput = isUrl(inputPath)
  let fileBar = null
  let lastProgress = 0

  try {
    // Use shared compressor if provided, otherwise create dedicated one
    // Shared compressor allows quota tracking across all files
    const fileCompressor = sharedCompressor || new TinyPNGCompressor({ apiKey: apiKeys })

    // Create individual progress bar for this file
    if (multiBar) {
      fileBar = multiBar.create(100, 0, {
        filename: displayName.substring(0, 40),
        status: 'Starting',
      })

      // Update file's progress bar based on progress events
      // Only update when progress actually changes to avoid duplicate lines
      fileCompressor.on('progress', data => {
        if (data.progress !== undefined && fileBar) {
          const currentProgress = Math.round(data.progress * 100)
          // Only update if progress changed
          if (currentProgress !== lastProgress) {
            lastProgress = currentProgress
            fileBar.update(currentProgress, {
              filename: displayName.substring(0, 40),
              status: data.message ? data.message.substring(0, 18) : 'Processing',
            })
          }
        }
      })
    }

    let originalSize
    let compressedBuffer

    if (isUrlInput) {
      // For URLs, we can't get original size until we fetch
      // Use compress directly which will handle URL via TinyPNG
      compressedBuffer = await fileCompressor.compress(inputPath, {
        resize: options.resize
          ? {
              method: options.method || 'fit',
              width: options.width,
              height: options.height,
            }
          : undefined,
      })
      // Estimate original size for URL (we don't know it)
      originalSize = compressedBuffer.length // Will show as 0% saved, but at least won't error
    } else {
      // For local files, get size first
      originalSize = statSync(inputPath).size
      compressedBuffer = await fileCompressor.compress(inputPath, {
        resize: options.resize
          ? {
              method: options.method || 'fit',
              width: options.width,
              height: options.height,
            }
          : undefined,
      })
    }

    const compressedSize = compressedBuffer.length
    const savedBytes = originalSize - compressedSize
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(2)

    // Ensure output directory exists
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    writeFileSync(outputPath, compressedBuffer)

    results.success++
    results.totalOriginalSize += originalSize
    results.totalCompressedSize += compressedSize

    // Update progress bar to complete
    if (fileBar) {
      fileBar.update(100, {
        filename: displayName.substring(0, 40),
        status: chalk.green('✓ Done'),
      })
    }

    return {
      success: true,
      filename: displayName,
      originalSize,
      compressedSize,
      savedPercent,
    }
  } catch (error) {
    results.failed++
    results.errors.push({ file: inputPath, error: error.message })

    // Update progress bar to show error
    if (fileBar) {
      fileBar.update(100, {
        filename: displayName.substring(0, 40),
        status: chalk.red('✗ Failed'),
      })
    }

    return {
      success: false,
      filename: displayName,
      error: error.message,
    }
  }
}

/**
 * Process a single file or URL conversion with individual progress bar
 */
export async function processSingleConvert(
  inputPath,
  outputPath,
  options,
  apiKeys,
  multiBar,
  results,
  baseDir,
  sharedCompressor = null
) {
  const displayName = getDisplayName(inputPath, baseDir)
  const isUrlInput = isUrl(inputPath)
  let fileBar = null
  let lastProgress = 0

  try {
    // Use shared compressor if provided, otherwise create dedicated one
    // Shared compressor allows quota tracking across all files
    const fileCompressor = sharedCompressor || new TinyPNGCompressor({ apiKey: apiKeys })

    // Create individual progress bar for this file
    if (multiBar) {
      fileBar = multiBar.create(100, 0, {
        filename: displayName.substring(0, 40),
        status: 'Starting',
      })

      // Update file's progress bar based on progress events
      // Only update when progress actually changes to avoid duplicate lines
      fileCompressor.on('progress', data => {
        if (data.progress !== undefined && fileBar) {
          const currentProgress = Math.round(data.progress * 100)
          // Only update if progress changed
          if (currentProgress !== lastProgress) {
            lastProgress = currentProgress
            fileBar.update(currentProgress, {
              filename: displayName.substring(0, 40),
              status: data.message ? data.message.substring(0, 18) : 'Processing',
            })
          }
        }
      })
    }

    // Import service for convert
    const TinyPNGService = await import('../../src/service.mjs')

    // Step 1: Compress first using the compressor (which emits progress events)
    fileBar?.update(10, {
      filename: displayName.substring(0, 40),
      status: 'Compressing...',
    })

    const compressedBuffer = await fileCompressor.compress(inputPath)

    // Step 2: Get output URL from the last compression
    const keyStat = fileCompressor.keyManager.getCurrentKey()

    // We need to upload again to get the outputUrl for convert
    fileBar?.update(50, {
      filename: displayName.substring(0, 40),
      status: 'Converting...',
    })

    const shrinkResult = isUrlInput
      ? await TinyPNGService.shrinkFromUrl(inputPath, keyStat.key)
      : await TinyPNGService.shrink(compressedBuffer, keyStat.key)

    // Step 3: Convert with real-time progress
    const mimeType = `image/${options.format.replace('.', '')}`
    const convertResult = await TinyPNGService.convert(
      shrinkResult.outputUrl,
      { type: mimeType },
      keyStat.key,
      (bytesReceived, totalBytes) => {
        // Calculate convert/download progress (50% to 95%)
        const downloadProgress = totalBytes > 0 ? bytesReceived / totalBytes : 0
        const currentProgress = 50 + Math.round(downloadProgress * 45) // 50% to 95%

        // Only update if progress changed
        if (currentProgress !== lastProgress) {
          lastProgress = currentProgress
          fileBar?.update(currentProgress, {
            filename: displayName.substring(0, 40),
            status: `Converting... (${Math.round(downloadProgress * 100)}%)`,
          })
        }
      }
    )

    const convertedBuffer = Buffer.from(await convertResult.response.arrayBuffer())

    // Ensure output directory exists
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    writeFileSync(outputPath, convertedBuffer)

    results.success++

    // Update progress bar to complete
    if (fileBar) {
      fileBar.update(100, {
        filename: displayName.substring(0, 40),
        status: chalk.green('✓ Done'),
      })
    }

    return {
      success: true,
      filename: displayName,
      outputFormat: options.format,
      outputSize: convertedBuffer.length,
    }
  } catch (error) {
    results.failed++
    results.errors.push({ file: inputPath, error: error.message })

    // Update progress bar to show error
    if (fileBar) {
      fileBar.update(100, {
        filename: displayName.substring(0, 40),
        status: chalk.red('✗ Failed'),
      })
    }

    return {
      success: false,
      filename: displayName,
      error: error.message,
    }
  }
}

/**
 * Process files with concurrency control
 */
export async function processFilesWithConcurrency(filesToProcess, options, apiKeys, concurrent, baseDir) {
  const results = {
    success: 0,
    failed: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    errors: [],
  }

  // Create a shared compressor instance to track quota across all files
  const sharedCompressor = new TinyPNGCompressor({ apiKey: apiKeys })

  // Use multi-progress bar for multiple files
  const useMultiBar = filesToProcess.length > 1
  let multiBar = null

  if (useMultiBar) {
    multiBar = new cliProgress.MultiBar(
      {
        format: '{filename} |{bar}| {percentage}% | {status}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: true,
        forceRedraw: false, // Prevent unnecessary redraws
        noTTYOutput: false,
        notTTYSchedule: 2000,
        synchronousUpdate: true, // Update synchronously to avoid race conditions
      },
      cliProgress.Presets.shades_grey
    )
  }

  // Create task queue
  const queue = filesToProcess.map(inputPath => ({
    inputPath,
    outputPath: getOutputPath(inputPath, options),
  }))

  // Process with concurrency limit
  const processQueue = async () => {
    const activePromises = []
    const completedResults = []

    for (const task of queue) {
      // Wait if we've reached the concurrency limit
      if (activePromises.length >= concurrent) {
        const result = await Promise.race(activePromises)
        completedResults.push(result.value)
        // Remove completed promise from active list
        const index = activePromises.findIndex(p => p === result.promise)
        if (index > -1) {
          activePromises.splice(index, 1)
        }
      }

      const promise = processSingleFile(
        task.inputPath,
        task.outputPath,
        options,
        apiKeys,
        multiBar,
        results,
        baseDir,
        sharedCompressor
      )
      const wrappedPromise = promise.then(value => ({ promise: wrappedPromise, value }))
      activePromises.push(wrappedPromise)
    }

    // Wait for all remaining promises
    const remainingResults = await Promise.all(activePromises)
    completedResults.push(...remainingResults.map(r => r.value))

    return completedResults
  }

  const fileResults = await processQueue()

  // Stop multi-progress bar
  if (multiBar) {
    multiBar.stop()
  }

  // Print results for each file
  console.log()
  for (const result of fileResults) {
    if (result.success) {
      console.log(
        chalk.green(
          `  ✓ ${result.filename} → ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)} (${chalk.bold(`-${result.savedPercent}%`)})`
        )
      )
    } else {
      console.log(chalk.red(`  ✗ ${result.filename}: ${result.error}`))
    }
  }

  // Return results and the shared compressor for quota display
  return { results, compressor: sharedCompressor }
}

/**
 * Process convert files with concurrency control
 */
export async function processConvertFilesWithConcurrency(
  filesToProcess,
  options,
  apiKeys,
  concurrent,
  baseDir
) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  }

  // Create a shared compressor instance to track quota across all files
  const sharedCompressor = new TinyPNGCompressor({ apiKey: apiKeys })

  const useMultiBar = filesToProcess.length > 1
  let multiBar = null

  if (useMultiBar) {
    multiBar = new cliProgress.MultiBar(
      {
        format: '{filename} |{bar}| {percentage}% | {status}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: true,
        forceRedraw: false,
        noTTYOutput: false,
        notTTYSchedule: 2000,
        synchronousUpdate: true,
      },
      cliProgress.Presets.shades_grey
    )
  }

  const queue = filesToProcess.map(inputPath => ({
    inputPath,
    outputPath: getConvertOutputPath(inputPath, options),
  }))

  const processQueue = async () => {
    const activePromises = []
    const completedResults = []

    for (const task of queue) {
      if (activePromises.length >= concurrent) {
        const result = await Promise.race(activePromises)
        completedResults.push(result.value)
        const index = activePromises.findIndex(p => p === result.promise)
        if (index > -1) {
          activePromises.splice(index, 1)
        }
      }

      const promise = processSingleConvert(
        task.inputPath,
        task.outputPath,
        options,
        apiKeys,
        multiBar,
        results,
        baseDir,
        sharedCompressor
      )
      const wrappedPromise = promise.then(value => ({ promise: wrappedPromise, value }))
      activePromises.push(wrappedPromise)
    }

    const remainingResults = await Promise.all(activePromises)
    completedResults.push(...remainingResults.map(r => r.value))

    return completedResults
  }

  const fileResults = await processQueue()

  if (multiBar) {
    multiBar.stop()
  }

  // Print results for each file
  console.log()
  for (const result of fileResults) {
    if (result.success) {
      console.log(
        chalk.green(`  ✓ ${result.filename} → ${options.format} (${formatSize(result.outputSize)})`)
      )
    } else {
      console.log(chalk.red(`  ✗ ${result.filename}: ${result.error}`))
    }
  }

  // Return results and the shared compressor for quota display
  return { results, compressor: sharedCompressor }
}
