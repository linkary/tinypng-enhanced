/**
 * CLI Commands for TinyPNG
 */

import { existsSync, writeFileSync, statSync } from 'node:fs'
import chalk from 'chalk'
import { getApiKey, loadConfig, saveConfig, promptApiKey, CONFIG_PATH } from './config.mjs'
import { expandFiles, getActualOutputDir } from './file-utils.mjs'
import { processFilesWithConcurrency, processConvertFilesWithConcurrency } from './processors.mjs'
import {
  displayCompressionSummary,
  displayConversionSummary,
  displayQuotaStatus,
  displayOutputInfo,
} from './display.mjs'
import { isUrl } from '../../src/utils/url.mjs'

/**
 * Compress command
 */
export async function compressCommand(files, options) {
  console.log(chalk.cyan.bold('\n🗜️  TinyPNG Compress\n'))

  const apiKeys = await getApiKey(options)

  // Get scan depth (default 1, max 10)
  const scanDepth = Math.max(1, Math.min(options.depth || 1, 10))

  // Determine base directory for relative path display
  // If single directory input, use it as base; otherwise use CWD
  let baseDir = null
  if (files.length === 1 && existsSync(files[0]) && statSync(files[0]).isDirectory()) {
    baseDir = files[0]
  }

  // Expand file patterns with specified depth
  const filesToProcess = expandFiles(files, scanDepth)

  if (filesToProcess.length === 0) {
    console.log(chalk.yellow('⚠️  No files found'))
    return
  }

  // Get concurrency setting (default 3, max 10)
  const concurrent = Math.max(1, Math.min(options.concurrent || 3, 10))

  console.log(chalk.gray(`Found ${filesToProcess.length} file(s) to compress`))
  if (scanDepth > 1) {
    console.log(chalk.gray(`Scan depth: ${scanDepth}`))
  }
  if (filesToProcess.length > 1) {
    console.log(chalk.gray(`Processing with ${concurrent} concurrent operation(s)\n`))
  } else {
    console.log()
  }

  // Process files with concurrency control and individual progress bars
  const { results, compressor } = await processFilesWithConcurrency(
    filesToProcess,
    options,
    apiKeys,
    concurrent,
    baseDir
  )

  // Display summary
  displayCompressionSummary(results)
  displayQuotaStatus(compressor)
  displayOutputInfo(options, getActualOutputDir(options, filesToProcess))
}

/**
 * Convert command
 */
export async function convertCommand(files, options) {
  console.log(chalk.cyan.bold('\n🔄 TinyPNG Convert\n'))

  if (!options.format) {
    console.error(chalk.red('❌ Format is required. Use --format <format>'))
    console.log(chalk.gray('   Supported formats: webp, png, jpeg, avif'))
    process.exit(1)
  }

  const apiKeys = await getApiKey(options)

  // Get scan depth (default 1, max 10)
  const scanDepth = Math.max(1, Math.min(options.depth || 1, 10))

  // Determine base directory for relative path display
  let baseDir = null
  if (files.length === 1 && !isUrl(files[0]) && existsSync(files[0]) && statSync(files[0]).isDirectory()) {
    baseDir = files[0]
  }

  // Expand file patterns with specified depth
  const filesToProcess = expandFiles(files, scanDepth)

  if (filesToProcess.length === 0) {
    console.log(chalk.yellow('⚠️  No files found'))
    return
  }

  // Get concurrency setting (default 3, max 10)
  const concurrent = Math.max(1, Math.min(options.concurrent || 3, 10))

  console.log(chalk.gray(`Found ${filesToProcess.length} file(s) to convert`))
  if (scanDepth > 1) {
    console.log(chalk.gray(`Scan depth: ${scanDepth}`))
  }
  if (filesToProcess.length > 1) {
    console.log(chalk.gray(`Processing with ${concurrent} concurrent operation(s)\n`))
  } else {
    console.log()
  }

  // Process files with concurrency control and individual progress bars
  const { results, compressor } = await processConvertFilesWithConcurrency(
    filesToProcess,
    options,
    apiKeys,
    concurrent,
    baseDir
  )

  // Display summary
  displayConversionSummary(results)
  displayQuotaStatus(compressor)
  displayOutputInfo(options, getActualOutputDir(options, filesToProcess))
}

/**
 * Config command
 */
export async function configCommand(options) {
  console.log(chalk.cyan.bold('\n⚙️  TinyPNG Configuration\n'))

  if (options.show) {
    const config = loadConfig()
    if (Object.keys(config).length === 0) {
      console.log(chalk.yellow('No configuration found'))
      console.log(chalk.gray(`Config file: ${CONFIG_PATH}\n`))
      return
    }

    console.log(chalk.gray('Current configuration:'))

    // Mask API keys for security
    const maskedConfig = { ...config }
    if (maskedConfig.apiKey) {
      maskedConfig.apiKey = maskedConfig.apiKey.map(
        (key, i) =>
          `${key.substring(0, 8)}${'*'.repeat(Math.max(0, key.length - 12))}${key.substring(key.length - 4)}`
      )
    }

    console.log(JSON.stringify(maskedConfig, null, 2))
    console.log(chalk.gray(`\nConfig file: ${CONFIG_PATH}\n`))
    return
  }

  if (options.reset) {
    if (existsSync(CONFIG_PATH)) {
      writeFileSync(CONFIG_PATH, '{}', 'utf-8')
      console.log(chalk.green('✓ Configuration reset'))
    } else {
      console.log(chalk.yellow('No configuration file found'))
    }
    return
  }

  // Interactive config
  const apiKeys = await promptApiKey()
  const config = { apiKey: apiKeys }

  if (saveConfig(config)) {
    console.log(chalk.green(`\n✓ ${apiKeys.length} API key(s) saved to ${CONFIG_PATH}\n`))
  }
}
