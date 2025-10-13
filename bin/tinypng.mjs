#!/usr/bin/env node

import { Command } from 'commander'
import { glob } from 'glob'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, basename, extname, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import readline from 'node:readline'
import chalk from 'chalk'
import ora from 'ora'
import TinyPNGCompressor from '../src/tinypng.mjs'

// Configuration file path
const CONFIG_PATH = join(homedir(), '.tinypngrc')

// Supported image extensions
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif']

/**
 * Load configuration from ~/.tinypngrc
 */
function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load config:'), error.message)
  }
  return {}
}

/**
 * Save configuration to ~/.tinypngrc
 */
function saveConfig(config) {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error(chalk.red('❌ Failed to save config:'), error.message)
    return false
  }
}

/**
 * Prompt user for API key(s)
 */
async function promptApiKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    console.log(chalk.cyan('\n🔑 TinyPNG API Key Setup'))
    console.log(chalk.gray('   Get your API key at: https://tinypng.com/developers'))
    console.log(chalk.gray('   For multiple keys, separate with commas\n'))

    rl.question(chalk.bold('Enter your TinyPNG API key(s): '), input => {
      rl.close()
      const keys = input
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
      resolve(keys)
    })
  })
}

/**
 * Get or prompt for API key(s)
 */
async function getApiKey(options) {
  // Check command line option
  if (options.key) {
    const keys = Array.isArray(options.key) ? options.key : [options.key]
    // Handle comma-separated keys in single string
    return keys.flatMap(k => k.split(',').map(s => s.trim())).filter(k => k.length > 0)
  }

  // Check config file
  const config = loadConfig()
  if (config.apiKey && config.apiKey.length > 0) {
    return Array.isArray(config.apiKey) ? config.apiKey : [config.apiKey]
  }

  // Prompt user
  console.log(chalk.yellow('⚠️  No API key found'))
  const apiKeys = await promptApiKey()

  if (!apiKeys || apiKeys.length === 0) {
    console.error(chalk.red('\n❌ API key is required'))
    process.exit(1)
  }

  // Validate by testing connection
  console.log(chalk.gray(`\n🔍 Validating ${apiKeys.length} API key(s)...`))
  const spinner = ora('Testing connection').start()

  try {
    const compressor = new TinyPNGCompressor({ apiKey: apiKeys })
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await compressor.compress(testImage)
    spinner.succeed(chalk.green(`✓ API key${apiKeys.length > 1 ? 's are' : ' is'} valid`))
  } catch (error) {
    spinner.fail(chalk.red('✗ API key validation failed'))
    console.error(chalk.red('Error:'), error.message)
    process.exit(1)
  }

  // Save to config
  config.apiKey = apiKeys
  if (saveConfig(config)) {
    console.log(chalk.green(`✓ ${apiKeys.length} API key(s) saved to ${CONFIG_PATH}`))
  }

  return apiKeys
}

/**
 * Expand file patterns to list of files
 */
async function expandFiles(patterns) {
  const files = new Set()

  for (const pattern of patterns) {
    // Check if it's a directory
    if (existsSync(pattern) && statSync(pattern).isDirectory()) {
      // Scan directory for images
      const dirFiles = await glob(join(pattern, '**', '*'), { nodir: true })
      dirFiles
        .filter(f => SUPPORTED_EXTENSIONS.includes(extname(f).toLowerCase()))
        .forEach(f => files.add(resolve(f)))
    } else {
      // Treat as glob pattern
      const matchedFiles = await glob(pattern, { nodir: true })
      matchedFiles
        .filter(f => SUPPORTED_EXTENSIONS.includes(extname(f).toLowerCase()))
        .forEach(f => files.add(resolve(f)))
    }
  }

  return Array.from(files)
}

/**
 * Get output path for a file
 */
function getOutputPath(inputPath, options) {
  if (options.overwrite) {
    return inputPath
  }

  const dir = dirname(inputPath)
  const ext = extname(inputPath)
  const base = basename(inputPath, ext)

  if (options.output) {
    // Check if output is a directory or file
    if (options.output.endsWith('/') || existsSync(options.output)) {
      const stat = statSync(options.output)
      if (stat.isDirectory()) {
        return join(options.output, `${base}${ext}`)
      }
    }
    // Single file mode
    return options.output
  }

  // Default: ./output/ directory
  const outputDir = join(process.cwd(), 'output')
  return join(outputDir, `${base}${ext}`)
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Compress command
 */
async function compressCommand(files, options) {
  console.log(chalk.cyan.bold('\n🗜️  TinyPNG Compress\n'))

  const apiKeys = await getApiKey(options)
  const compressor = new TinyPNGCompressor({ apiKey: apiKeys })

  // Expand file patterns
  const filesToProcess = await expandFiles(files)

  if (filesToProcess.length === 0) {
    console.log(chalk.yellow('⚠️  No files found'))
    return
  }

  console.log(chalk.gray(`Found ${filesToProcess.length} file(s) to compress\n`))

  // Ensure output directory exists
  if (!options.overwrite && options.output) {
    const outputDir = options.output.endsWith('/') ? options.output : dirname(options.output)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }
  } else if (!options.overwrite) {
    const defaultOutput = join(process.cwd(), 'output')
    if (!existsSync(defaultOutput)) {
      mkdirSync(defaultOutput, { recursive: true })
    }
  }

  const results = {
    success: 0,
    failed: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    errors: [],
  }

  // Process each file
  for (let i = 0; i < filesToProcess.length; i++) {
    const inputPath = filesToProcess[i]
    const outputPath = getOutputPath(inputPath, options)
    const spinner = ora(chalk.gray(`[${i + 1}/${filesToProcess.length}] ${basename(inputPath)}`)).start()

    try {
      const originalSize = statSync(inputPath).size
      const compressedBuffer = await compressor.compress(inputPath, {
        resize: options.resize
          ? {
              method: options.method || 'fit',
              width: options.width,
              height: options.height,
            }
          : undefined,
      })

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

      spinner.succeed(
        chalk.green(
          `${basename(inputPath)} → ${formatSize(originalSize)} → ${formatSize(compressedSize)} (${chalk.bold(
            `-${savedPercent}%`
          )})`
        )
      )
    } catch (error) {
      results.failed++
      results.errors.push({ file: inputPath, error: error.message })
      spinner.fail(chalk.red(`${basename(inputPath)}: ${error.message}`))
    }
  }

  // Summary
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

  // Show quota - enhanced display with remaining counts
  const summary = compressor.getSummary()
  const stats = compressor.getStats()

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

  if (!options.overwrite) {
    const outputInfo = options.output || './output/'
    console.log(chalk.gray(`\nOutput: ${outputInfo}\n`))
  } else {
    console.log(chalk.yellow(`\n⚠️  Files were overwritten\n`))
  }
}

/**
 * Convert command
 */
async function convertCommand(files, options) {
  console.log(chalk.cyan.bold('\n🔄 TinyPNG Convert\n'))

  if (!options.format) {
    console.error(chalk.red('❌ Format is required. Use --format <format>'))
    console.log(chalk.gray('   Supported formats: webp, png, jpeg, avif'))
    process.exit(1)
  }

  const apiKeys = await getApiKey(options)
  const compressor = new TinyPNGCompressor({ apiKey: apiKeys })

  // Expand file patterns
  const filesToProcess = await expandFiles(files)

  if (filesToProcess.length === 0) {
    console.log(chalk.yellow('⚠️  No files found'))
    return
  }

  console.log(chalk.gray(`Found ${filesToProcess.length} file(s) to convert\n`))

  // Ensure output directory exists
  if (!options.overwrite) {
    const outputDir = options.output || join(process.cwd(), 'output')
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  }

  // Import service for convert
  const TinyPNGService = await import('../src/service.mjs')

  // Process each file
  for (let i = 0; i < filesToProcess.length; i++) {
    const inputPath = filesToProcess[i]
    const ext = options.format.startsWith('.') ? options.format : `.${options.format}`
    const base = basename(inputPath, extname(inputPath))

    let outputPath
    if (options.overwrite) {
      outputPath = inputPath
    } else if (options.output) {
      if (
        options.output.endsWith('/') ||
        (existsSync(options.output) && statSync(options.output).isDirectory())
      ) {
        outputPath = join(options.output, `${base}${ext}`)
      } else {
        outputPath = options.output
      }
    } else {
      outputPath = join(process.cwd(), 'output', `${base}${ext}`)
    }

    const spinner = ora(chalk.gray(`[${i + 1}/${filesToProcess.length}] ${basename(inputPath)}`)).start()

    try {
      // First compress
      const buffer = readFileSync(inputPath)
      const keyStat = compressor.keyManager.selectBestKey()

      const shrinkResult = await TinyPNGService.shrink(buffer, keyStat.key)

      // Then convert
      const mimeType = `image/${options.format.replace('.', '')}`
      const convertResult = await TinyPNGService.convert(
        shrinkResult.outputUrl,
        { type: mimeType },
        keyStat.key
      )

      const convertedBuffer = Buffer.from(await convertResult.response.arrayBuffer())

      // Ensure output directory exists
      const outputDir = dirname(outputPath)
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      writeFileSync(outputPath, convertedBuffer)

      results.success++
      spinner.succeed(chalk.green(`${basename(inputPath)} → ${basename(outputPath)} (${options.format})`))
    } catch (error) {
      results.failed++
      results.errors.push({ file: inputPath, error: error.message })
      spinner.fail(chalk.red(`${basename(inputPath)}: ${error.message}`))
    }
  }

  // Summary
  console.log(chalk.cyan.bold('\n📊 Summary'))
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.green(`✓ Success: ${results.success}`))
  if (results.failed > 0) {
    console.log(chalk.red(`✗ Failed: ${results.failed}`))
  }

  // Show quota - enhanced display with remaining counts
  const summary = compressor.getSummary()
  const stats = compressor.getStats()

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

  if (!options.overwrite) {
    const outputInfo = options.output || './output/'
    console.log(chalk.gray(`\nOutput: ${outputInfo}\n`))
  } else {
    console.log(chalk.yellow(`\n⚠️  Files were overwritten\n`))
  }
}

/**
 * Config command
 */
async function configCommand(options) {
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

// CLI setup
const program = new Command()

program
  .name('tinypng')
  .description('TinyPNG CLI - Compress and convert images with TinyPNG API')
  .version('1.0.0')

// Compress command
program
  .command('compress <files...>')
  .alias('c')
  .description('Compress images')
  .option('-k, --key <keys...>', 'API key(s) - separate multiple keys with spaces or commas')
  .option('-o, --output <path>', 'Output directory or file (default: ./output/)')
  .option('-w, --overwrite', 'Overwrite original files')
  .option('-r, --resize', 'Enable resize')
  .option('-m, --method <method>', 'Resize method (scale, fit, cover, thumb)')
  .option('--width <width>', 'Target width', parseInt)
  .option('--height <height>', 'Target height', parseInt)
  .action(compressCommand)

// Convert command
program
  .command('convert <files...>')
  .alias('cv')
  .description('Convert images to different format')
  .option('-k, --key <keys...>', 'API key(s) - separate multiple keys with spaces or commas')
  .option('-f, --format <format>', 'Target format (webp, png, jpeg, avif)')
  .option('-o, --output <path>', 'Output directory or file (default: ./output/)')
  .option('-w, --overwrite', 'Overwrite original files')
  .action(convertCommand)

// Config command
program
  .command('config')
  .alias('cfg')
  .description('Manage configuration')
  .option('-s, --show', 'Show current configuration')
  .option('-r, --reset', 'Reset configuration')
  .action(configCommand)

// Parse arguments
program.parse(process.argv)

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
