/**
 * Display utilities for TinyPNG CLI
 */

import chalk from 'chalk'
import TinyPNGCompressor from '../../src/tinypng.mjs'
import { formatSize } from '../../src/utils/compression.mjs'

/**
 * Display compression results summary
 */
export function displayCompressionSummary(results) {
  console.log(chalk.cyan.bold('\n📊 Summary'))
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.green(`✓ Success: ${results.success}`))
  if (results.failed > 0) {
    console.log(chalk.red(`✗ Failed: ${results.failed}`))
  }
  console.log(
    chalk.gray(
      `Total saved: ${formatSize(results.totalOriginalSize - results.totalCompressedSize)} (${(
        (1 - results.totalCompressedSize / results.totalOriginalSize) *
        100
      ).toFixed(2)}%)`
    )
  )
}

/**
 * Display conversion results summary
 */
export function displayConversionSummary(results) {
  console.log(chalk.cyan.bold('\n📊 Summary'))
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.green(`✓ Success: ${results.success}`))
  if (results.failed > 0) {
    console.log(chalk.red(`✗ Failed: ${results.failed}`))
  }
}

/**
 * Display quota status
 */
export function displayQuotaStatus(apiKeys) {
  // Create a temporary compressor instance to get stats
  const tempCompressor = new TinyPNGCompressor({ apiKey: apiKeys })
  const summary = tempCompressor.getSummary()
  const stats = tempCompressor.getStats()

  console.log(chalk.cyan.bold('\n📊 Quota Status'))

  if (summary.totalLimit) {
    const remaining = summary.totalLimit - summary.totalUsed
    const percentUsed = ((summary.totalUsed / summary.totalLimit) * 100).toFixed(1)

    // Color code based on remaining
    let remainingColor = chalk.green
    if (remaining < 50) remainingColor = chalk.red
    else if (remaining < 100) remainingColor = chalk.yellow

    console.log(
      chalk.gray(
        `   Total: ${remainingColor(remaining)} remaining (${summary.totalUsed} used, ${
          summary.totalLimit
        } limit) · ${percentUsed}% used`
      )
    )

    // Show only keys that were actually used (have compressionCount > 0 and updated)
    const usedKeys = stats.filter(stat => stat.compressionCount !== null && stat.compressionCount > 0)

    if (usedKeys.length > 0) {
      const keysDisplay = usedKeys
        .map(stat => {
          const remaining = stat.remaining
          let keyColor = chalk.green
          if (remaining < 50) keyColor = chalk.red
          else if (remaining < 100) keyColor = chalk.yellow

          return `Key ${stat.keyIndex + 1} (${keyColor(remaining)})`
        })
        .join(' · ')

      console.log(chalk.gray(`   Keys: ${keysDisplay}`))

      // Warning for low quota
      const lowKeys = usedKeys.filter(stat => stat.remaining < 100)
      if (lowKeys.length > 0) {
        console.log(chalk.yellow(`   ⚠️  Warning: ${lowKeys.length} key(s) running low (<100 remaining)`))
      }
    }
  } else {
    console.log(chalk.gray(`   Used: ${summary.totalUsed} compressions`))
  }
}

/**
 * Display output information
 */
export function displayOutputInfo(options) {
  if (!options.overwrite) {
    const outputInfo = options.output || '<input-dir>/output/'
    console.log(chalk.gray(`\nOutput: ${outputInfo}\n`))
  } else {
    console.log(chalk.yellow(`\n⚠️  Files were overwritten\n`))
  }
}
