# TinyPNG Compressor

A powerful [TinyPNG](https://tinypng.com/) CLI and module tool with multiple API key support.

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)]()

English | [简体中文](./README.md)

![](https://img.alicdn.com/imgextra/i3/O1CN01DQ0dwA1ROld2OAkHc_!!6000000002102-1-tps-888-632.gif)

## Features

**Advanced API Key Management**

- Multiple API key support with automatic rotation
- Least-used strategy for optimal load balancing
- Real-time quota tracking from API responses
- Smart warnings when approaching limits

**Comprehensive Image Processing**

- 🗜️ Image compression (PNG, JPEG, WebP, AVIF)
- 🔄 Format conversion (PNG ↔ JPEG ↔ WebP ↔ AVIF)
- 📐 Intelligent resizing (scale, fit, cover, thumb)
- 🎯 Batch processing with progress tracking

## Installation

### As a CLI Tool (Global)

```bash
npm install -g tinypng-enhanced
```

### As a Library

```bash
npm install tinypng-enhanced
```

## Quick Start

### CLI Usage

**First-time setup:**

```bash
# Configure your API key(s)
tinypng config
```

**Compress images:**

```bash
# Single file (default command)
tinypng image.png

# Or use explicit command
tinypng compress image.png
tinypng c image.png

# Multiple files (automatically shows progress bar)
tinypng *.png *.jpg

# Entire directory
tinypng ./photos/

# With resize
tinypng banner.jpg -r -m fit --width 1920 --height 1080
```

**Convert formats:**

```bash
# Convert to WebP
tinypng convert *.png -f webp

# Convert to AVIF (best compression)
tinypng cv images/*.jpg -f avif
```

**Output (with progress bar for batch operations):**

```
🗜️  TinyPNG Compress

Found 3 file(s) to compress

Progress |████████████████████| 100% | 3/3 files | image3.png
  ✓ image1.png → 512 KB → 128 KB (-75.00%)
  ✓ image2.jpg → 1.2 MB → 450 KB (-62.50%)
  ✓ image3.png → 256 KB → 89 KB (-65.23%)

📊 Summary
──────────────────────────────────────────────────
✓ Success: 3
Total saved: 1.02 MB (70.15%)

📊 Quota Status
   Total: 497 remaining (3 used, 500 limit) · 0.6% used
   Keys: Key 1 (497)

Output: <input-dir>/output/
```

**Examples:**

1. Overwrite original images

![](https://img.alicdn.com/imgextra/i3/O1CN012xlV8B1KJXnmC616R_!!6000000001143-1-tps-888-632.gif)

2. Save to output directory

![](https://img.alicdn.com/imgextra/i3/O1CN01DQ0dwA1ROld2OAkHc_!!6000000002102-1-tps-888-632.gif)

### Library Usage

```javascript
import { TinyPNGCompressor } from 'tinypng-enhanced'
import { readFileSync, writeFileSync } from 'fs'

// Initialize with API key(s)
const compressor = new TinyPNGCompressor({
  apiKey: ['key1', 'key2', 'key3'], // Multiple keys for unlimited compression
})

// Compress image
const inputBuffer = readFileSync('input.png')
const result = await compressor.compress(inputBuffer)

// Save compressed image
writeFileSync('output.png', result.output)

console.log(`Saved ${result.savedBytes} bytes (${result.savedPercent}%)`)

// Get quota information
const summary = compressor.getSummary()
console.log(`Quota used: ${summary.totalUsed}/${summary.totalLimit}`)
```

## CLI Documentation

### Commands

#### Default Command (Compress)

⚡ **New in v2.0:** `tinypng <files>` now defaults to compress!

```bash
# New shortcut (v2.0+)
tinypng image.png

# Equivalent to
tinypng compress image.png
tinypng c image.png
```

#### `tinypng compress` (alias: `c`)

Compress images with optional resizing.

```bash
tinypng compress <files...> [options]
# Or shorthand
tinypng <files...> [options]

Options:
  -k, --key <keys...>     API key(s) - separate multiple keys with spaces or commas
  -o, --output <path>     Output directory or file (default: <input-dir>/output/)
  -w, --overwrite         Overwrite original files
  -r, --resize            Enable resize
  -m, --method <method>   Resize method (scale, fit, cover, thumb)
  --width <width>         Target width
  --height <height>       Target height
```

**📊 Progress Display:**

- **Single file:** Spinner showing status
- **Multiple files (2+):** Auto progress bar with real-time percentage and file count

**Resize Methods:**

| Method  | Description                       | Required         |
| ------- | --------------------------------- | ---------------- |
| `scale` | Scale image proportionally        | width OR height  |
| `fit`   | Scale to fit within dimensions    | width AND height |
| `cover` | Scale and crop to fill dimensions | width AND height |
| `thumb` | Smart crop for thumbnails         | width AND height |

**Examples:**

```bash
# Basic compression
tinypng c image.png

# Multiple files with output directory
tinypng c *.png -o compressed/

# Resize and compress
tinypng c banner.jpg -r -m fit --width 1920 --height 1080

# Overwrite originals (careful!)
tinypng c *.png -w

# Multiple API keys
tinypng c images/*.png -k key1 key2 key3
```

#### `tinypng convert` (alias: `cv`)

Convert images to different formats.

```bash
tinypng convert <files...> [options]

Options:
  -k, --key <keys...>     API key(s)
  -f, --format <format>   Target format (webp, png, jpeg, avif) [REQUIRED]
  -o, --output <path>     Output directory or file (default: ./output/)
  -w, --overwrite         Overwrite original files
```

**Supported Formats:**

| Format | Extension | Transparency | Best For                        |
| ------ | --------- | ------------ | ------------------------------- |
| PNG    | `.png`    | ✅ Yes       | Screenshots, graphics           |
| JPEG   | `.jpg`    | ❌ No        | Photos                          |
| WebP   | `.webp`   | ✅ Yes       | Modern web, great compression   |
| AVIF   | `.avif`   | ✅ Yes       | Next-gen format, smallest files |

**Examples:**

```bash
# Convert to WebP
tinypng cv *.png -f webp

# Convert to AVIF with custom output
tinypng cv images/*.jpg -f avif -o converted/

# Convert and overwrite
tinypng cv *.jpg -f webp -w
```

#### `tinypng config` (alias: `cfg`)

Manage API key configuration.

```bash
tinypng config [options]

Options:
  -s, --show    Show current configuration (keys masked)
  -r, --reset   Reset configuration
```

**Examples:**

```bash
# Interactive setup
tinypng config

# Show current config
tinypng cfg -s

# Reset configuration
tinypng cfg -r
```

### Command Shortcuts

| Full          | Short | Description    |
| ------------- | ----- | -------------- |
| `compress`    | `c`   | Compress       |
| `convert`     | `cv`  | Convert format |
| `config`      | `cfg` | Config manager |
| `--overwrite` | `-w`  | Overwrite      |
| `--resize`    | `-r`  | Enable resize  |
| `--format`    | `-f`  | Target format  |
| `--method`    | `-m`  | Resize method  |
| `--output`    | `-o`  | Output path    |
| `--key`       | `-k`  | API key        |

### Multiple API Keys

TinyPNG provides 500 free compressions per API key per month. Use multiple keys for unlimited compression:

**Setup:**

```bash
# Interactive (comma-separated)
tinypng config
Enter your TinyPNG API key(s): key1, key2, key3

# Command line (space-separated)
tinypng c images/*.png -k key1 key2 key3
```

### Configuration File

API keys are stored in `~/.tinypngrc`:

```json
{
  "apiKey": ["key1", "key2", "key3"]
}
```

## Library API

### Constructor

```typescript
import { TinyPNGCompressor } from 'tinypng-enhanced'

const compressor = new TinyPNGCompressor(options)
```

**Options:**

| Option             | Type                 | Default | Description                   |
| ------------------ | -------------------- | ------- | ----------------------------- |
| `apiKey`           | `string \| string[]` | -       | TinyPNG API key(s) [REQUIRED] |
| `compressionCount` | `number`             | `500`   | Monthly limit per key         |

**Example:**

```javascript
const compressor = new TinyPNGCompressor({
  apiKey: ['key1', 'key2', 'key3'],
  compressionCount: 500, // Default
})
```

### Methods

#### `compress(source, options?)`

Compress an image.

**Parameters:**

- `source`: `Buffer | string | ReadableStream` - Image data or file path
- `options.resize`: `Object` - Optional resize options
  - `method`: `'scale' | 'fit' | 'cover' | 'thumb'`
  - `width`: `number`
  - `height`: `number`

**Returns:** `Promise<CompressResult>`

```typescript
{
  output: Buffer // Compressed image data
  input: Buffer // Original image data (if provided as Buffer)
  inputSize: number // Original size in bytes
  outputSize: number // Compressed size in bytes
  savedBytes: number // Bytes saved
  savedPercent: string // Percentage saved (e.g., "65.23")
}
```

**Examples:**

```javascript
// From buffer
const buffer = readFileSync('input.png')
const result = await compressor.compress(buffer)

// From file path
const result = await compressor.compress('input.png')

// From stream
const stream = createReadStream('input.png')
const result = await compressor.compress(stream)

// With resize
const result = await compressor.compress(buffer, {
  resize: {
    method: 'fit',
    width: 1920,
    height: 1080,
  },
})

// Save result
writeFileSync('output.png', result.output)
```

#### `convert(source, format)`

Convert image format.

**Parameters:**

- `source`: `Buffer | string | ReadableStream` - Image data or file path
- `format`: `'image/webp' | 'image/png' | 'image/jpeg' | 'image/avif'` - Target format

**Returns:** `Promise<Buffer>` - Converted image data

**Example:**

```javascript
const buffer = readFileSync('input.png')
const webp = await compressor.convert(buffer, 'image/webp')
writeFileSync('output.webp', webp)
```

#### `getStats()`

Get statistics for each API key.

**Returns:** `PublicKeyStat[]`

```typescript
{
  keyIndex: number // Key index (0-based)
  compressionCount: number // Current usage count
  monthlyLimit: number // Monthly limit
  remaining: number // Remaining compressions
  percentUsed: string // Usage percentage
  lastUpdated: number // Last update timestamp
  disabled: boolean // Whether key is disabled
  lastError: string | null // Last error message
}
```

**Example:**

```javascript
const stats = compressor.getStats()
stats.forEach((stat, i) => {
  console.log(`Key ${i + 1}: ${stat.remaining} remaining`)
})
```

#### `getSummary()`

Get summary statistics across all keys.

**Returns:** `KeySummary`

```typescript
{
  totalKeys: number // Total number of keys
  activeKeys: number // Number of active keys
  disabledKeys: number // Number of disabled keys
  totalUsed: number // Total compressions used
  totalLimit: number // Total monthly limit
  totalRemaining: number // Total remaining compressions
}
```

**Example:**

```javascript
const summary = compressor.getSummary()
console.log(`Quota: ${summary.totalUsed}/${summary.totalLimit}`)
console.log(`Remaining: ${summary.totalRemaining}`)
```

#### `resetCounts()`

Reset compression counts (call at the start of each month).

**Example:**

```javascript
compressor.resetCounts()
```

### Events

The compressor emits events for progress tracking:

```javascript
// Initialization
compressor.on('init', data => {
  console.log(`Initialized with ${data.keyCount} keys`)
})

// Compression start
compressor.on('compress-start', data => {
  console.log(`Starting compression with key ${data.keyIndex}`)
})

// Compression success
compressor.on('compress-success', data => {
  console.log(`Saved ${data.savedBytes} bytes (${data.savedPercent}%)`)
})

// Compression error
compressor.on('compress-error', data => {
  console.error(`Error: ${data.error.message}`)
})

// Progress (for streams)
compressor.on('progress', data => {
  console.log(`Progress: ${data.percentage}%`)
})

// Quota update
compressor.on('quota-update', data => {
  console.log(`Quota: ${data.used}/${data.limit}`)
})
```

## Configuration

### API Key Priority

API keys are resolved in the following order:

1. **Command line option**: `-k key1 key2 key3`
2. **Config file**: `~/.tinypngrc`
3. **Interactive prompt**: If none of the above

## Examples

### Compress All Images in Directory

```javascript
import { TinyPNGCompressor } from 'tinypng-enhanced'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const compressor = new TinyPNGCompressor({
  apiKey: process.env.TINYPNG_API_KEY,
})

const files = await readdir('./images')
await mkdir('./compressed', { recursive: true })

for (const file of files) {
  if (!/\.(png|jpg|jpeg|webp)$/i.test(file)) continue

  const input = await readFile(join('./images', file))
  const result = await compressor.compress(input)
  await writeFile(join('./compressed', file), result.output)

  console.log(`${file}: saved ${result.savedPercent}%`)
}

const summary = compressor.getSummary()
console.log(`Total quota used: ${summary.totalUsed}/${summary.totalLimit}`)
```

### Batch Convert to WebP

```javascript
import { TinyPNGCompressor } from 'tinypng-enhanced'
import { readdir } from 'fs/promises'
import { basename, extname } from 'path'

const compressor = new TinyPNGCompressor({
  apiKey: ['key1', 'key2', 'key3'],
})

const files = await readdir('./images')

for (const file of files) {
  if (!/\.(png|jpg|jpeg)$/i.test(file)) continue

  const webp = await compressor.convert(`./images/${file}`, 'image/webp')
  const outputName = basename(file, extname(file)) + '.webp'
  await writeFile(`./webp/${outputName}`, webp)

  console.log(`Converted ${file} → ${outputName}`)
}
```

### With Progress Tracking

```javascript
const compressor = new TinyPNGCompressor({ apiKey: 'your-key' })

compressor.on('progress', ({ percentage }) => {
  process.stdout.write(`\rProgress: ${percentage.toFixed(1)}%`)
})

compressor.on('compress-success', ({ savedPercent }) => {
  console.log(`\nSaved ${savedPercent}%`)
})

const result = await compressor.compress('./large-image.png')
```

### Responsive Image Generation

```javascript
const sizes = [
  { name: 'mobile', width: 640, height: 960 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
]

for (const size of sizes) {
  const result = await compressor.compress('hero.jpg', {
    resize: {
      method: 'cover',
      width: size.width,
      height: size.height,
    },
  })

  await writeFile(`hero-${size.name}.jpg`, result.output)
  console.log(`${size.name}: ${result.savedPercent}% saved`)
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Structure:**

```
src/
├── service.test.mjs         # Service layer tests
├── tinypng.test.mjs         # Main API tests
├── key-manager.test.mjs     # Key management tests
└── utils/
    ├── file-info.test.mjs   # File utilities tests
    ├── multipart.test.mjs   # Multipart tests
    └── progress-tracker.test.mjs  # Progress tests
```

**Run Integration Tests:**

Integration tests require a valid API key:

```bash
export TINYPNG_API_KEY="your-api-key"
npm test
```

To skip integration tests:

```bash
npm test -- --grep -Integration
```

## Project Structure

```
tiny-png/
├── bin/
│   └── tinypng.mjs          # CLI entry point
├── src/
│   ├── tinypng.mjs          # Main TinyPNGCompressor class
│   ├── service.mjs          # TinyPNG API service layer
│   ├── key-manager.mjs      # API key management
│   ├── constant.mjs         # Constants
│   └── utils/
│       ├── file-info.mjs    # File information utilities
│       ├── multipart.mjs    # Multipart form data
│       └── progress-tracker.mjs  # Progress tracking
├── test/                    # Test images and output
├── package.json
├── vitest.config.mjs
└── README.md
```

## License

MIT

---

**Get your free API key at [tinypng.com/developers](https://tinypng.com/developers)**
