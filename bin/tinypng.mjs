#!/usr/bin/env node

/**
 * TinyPNG CLI - Compress and convert images with TinyPNG API
 *
 * This is the main entry point that sets up the CLI using Commander.js
 * All command implementations are in separate modules for maintainability
 */

import { Command } from 'commander'
import { compressCommand, convertCommand, configCommand } from './lib/commands.mjs'

// CLI setup
const program = new Command()

program
  .name('tinypng')
  .description('TinyPNG CLI - Compress and convert images with TinyPNG API')
  .version('2.1.0')

// Compress command (explicit and default)
program
  .command('compress <files...>', { isDefault: true })
  .alias('c')
  .description('Compress images')
  .option('-k, --key <keys...>', 'API key(s) - separate multiple keys with spaces or commas')
  .option('-o, --output <path>', 'Output directory or file (default: <input-dir>/output/)')
  .option('-w, --overwrite', 'Overwrite original files')
  .option('-r, --resize', 'Enable resize')
  .option('-m, --method <method>', 'Resize method (scale, fit, cover, thumb)')
  .option('--width <width>', 'Target width', parseInt)
  .option('--height <height>', 'Target height', parseInt)
  .option('-n, --concurrent <number>', 'Number of concurrent operations (default: 3, max: 10)', parseInt)
  .option('-d, --depth <number>', 'Directory scan depth for nested folders (default: 1, max: 10)', parseInt)
  .action(compressCommand)

// Convert command
program
  .command('convert <files...>')
  .alias('cv')
  .description('Convert images to different format')
  .option('-k, --key <keys...>', 'API key(s) - separate multiple keys with spaces or commas')
  .option('-f, --format <format>', 'Target format (webp, png, jpeg, avif)')
  .option('-o, --output <path>', 'Output directory or file (default: same as input directory)')
  .option('-b, --background <color>', 'Background color for JPEG conversion (default: white)')
  .option('-n, --concurrent <number>', 'Number of concurrent operations (default: 3, max: 10)', parseInt)
  .option('-d, --depth <number>', 'Directory scan depth for nested folders (default: 1, max: 10)', parseInt)
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
