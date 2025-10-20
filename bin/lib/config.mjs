/**
 * Configuration management for TinyPNG CLI
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import readline from 'node:readline'
import chalk from 'chalk'
import ora from 'ora'
import TinyPNGCompressor from '../../src/tinypng.mjs'

// Configuration file path
export const CONFIG_PATH = join(homedir(), '.tinypngrc')

/**
 * Load configuration from ~/.tinypngrc
 */
export function loadConfig() {
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
export function saveConfig(config) {
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
export async function promptApiKey() {
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
export async function getApiKey(options) {
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
