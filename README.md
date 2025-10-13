# TinyPNG Compressor

A powerful Node.js library and CLI tool for image compression and format conversion using the [TinyPNG API](https://tinypng.com/).

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)]()

English | [简体中文](./README.zh-CN.md)

## Features

✨ **Comprehensive Image Processing**

- 🗜️ Image compression (PNG, JPEG, WebP, AVIF)
- 🔄 Format conversion (PNG ↔ JPEG ↔ WebP ↔ AVIF)
- 📐 Intelligent resizing (scale, fit, cover, thumb)
- 🎯 Batch processing with progress tracking

🔑 **Advanced API Key Management**

- Multiple API key support with automatic rotation
- Least-used strategy for optimal load balancing
- Real-time quota tracking from API responses
- Smart warnings when approaching limits

💻 **Flexible Usage**

- **Node.js Library**: Full programmatic API with event emitters
- **CLI Tool**: User-friendly command-line interface
- **Stream Support**: Efficient memory usage with streams
- **TypeScript**: Full type definitions included

🎨 **Developer Experience**

- Beautiful CLI output with colors and spinners
- Comprehensive error handling and reporting
- Progress tracking for batch operations
- Extensive test coverage with Vitest

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
  - [CLI Usage](#cli-usage)
  - [Library Usage](#library-usage)
- [CLI Documentation](#cli-documentation)
- [Library API](#library-api)
- [Configuration](#configuration)
- [Examples](#examples)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Installation

### As a CLI Tool (Global)

```bash
npm install -g tiny-png
```

Or install locally and use `npm link`:

```bash
git clone <repository-url>
cd tiny-png
npm install
npm link
```

### As a Library

```bash
npm install tiny-png
```

## Quick Start

### CLI Usage

**First-time setup:**

```bash
# Configure your API key(s)
tinypng config

# Or set via environment variable
export TINYPNG_API_KEY="your-api-key"
```

**Compress images:**

```bash
# Single file
tinypng compress image.png

# Multiple files
tinypng c *.png *.jpg

# Entire directory
tinypng c ./photos/

# With resize
tinypng c banner.jpg -r -m fit --width 1920 --height 1080
```

**Convert formats:**

```bash
# Convert to WebP
tinypng convert *.png -f webp

# Convert to AVIF (best compression)
tinypng cv images/*.jpg -f avif
```

**Output:**

```
🗜️  TinyPNG Compress

Found 3 file(s) to compress

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

Output: ./output/
```

### Library Usage

```javascript
import { TinyPNGCompressor } from 'tiny-png'
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

#### `tinypng compress` (alias: `c`)

Compress images with optional resizing.

```bash
tinypng compress <files...> [options]

Options:
  -k, --key <keys...>     API key(s) - separate multiple keys with spaces or commas
  -o, --output <path>     Output directory or file (default: ./output/)
  -w, --overwrite         Overwrite original files
  -r, --resize            Enable resize
  -m, --method <method>   Resize method (scale, fit, cover, thumb)
  --width <width>         Target width
  --height <height>       Target height
```

**Resize Methods:**

| Method  | Description                                 | Required         |
| ------- | ------------------------------------------- | ---------------- |
| `scale` | Proportionally scales image                 | width OR height  |
| `fit`   | Scales to fit within dimensions             | width AND height |
| `cover` | Scales and crops to fill dimensions exactly | width AND height |
| `thumb` | Intelligent cropping for thumbnails         | width AND height |

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

| Format | Extension | Transparency | Best For                          |
| ------ | --------- | ------------ | --------------------------------- |
| PNG    | `.png`    | ✅ Yes       | Screenshots, graphics             |
| JPEG   | `.jpg`    | ❌ No        | Photos                            |
| WebP   | `.webp`   | ✅ Yes       | Modern web, excellent compression |
| AVIF   | `.avif`   | ✅ Yes       | Next-gen, smallest files          |

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

### Shortcut Flags

| Long Form     | Short | Description         |
| ------------- | ----- | ------------------- |
| `compress`    | `c`   | Compress images     |
| `convert`     | `cv`  | Convert format      |
| `config`      | `cfg` | Manage config       |
| `--overwrite` | `-w`  | Overwrite originals |
| `--resize`    | `-r`  | Enable resize       |
| `--format`    | `-f`  | Target format       |
| `--method`    | `-m`  | Resize method       |
| `--output`    | `-o`  | Output path         |
| `--key`       | `-k`  | API key(s)          |

### Multiple API Keys

TinyPNG provides 500 free compressions per API key per month. Use multiple keys for unlimited compression:

**Setup:**

```bash
# Interactive (comma-separated)
tinypng config
Enter your TinyPNG API key(s): key1, key2, key3

# Command line (space-separated)
tinypng c images/*.png -k key1 key2 key3

# Environment variable (comma-separated)
export TINYPNG_API_KEY="key1,key2,key3"
```

**How it works:**

- Automatically rotates between keys
- Uses "least-used" strategy to balance load
- Real-time quota tracking
- Smart warnings when approaching limits

### Quota Display

The CLI shows enhanced quota information after each operation:

**Normal Status:**

```
📊 Quota Status
   Total: 1455 remaining (45 used, 1500 limit) · 3.0% used
   Keys: Key 1 (483) · Key 2 (492)
```

**Low Quota Warning:**

```
📊 Quota Status
   Total: 85 remaining (1415 used, 1500 limit) · 94.3% used
   Keys: Key 1 (45) · Key 2 (40)
   ⚠️  Warning: 2 key(s) running low (<100 remaining)
```

**Features:**

- Shows only used keys (saves API calls)
- Color-coded: Green (>100), Yellow (50-100), Red (<50)
- Warns when any key has <100 compressions remaining

### Configuration File

API keys are stored in `~/.tinypngrc`:

```json
{
  "apiKey": ["key1", "key2", "key3"]
}
```

**Security:**

- File is user-readable only (600 permissions)
- Keys are masked when shown with `config -s`
- Not tracked in git (`.tinypngrc` in `.gitignore`)

## Library API

### Constructor

```typescript
import { TinyPNGCompressor } from 'tiny-png'

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
2. **Environment variable**: `TINYPNG_API_KEY="key1,key2,key3"`
3. **Config file**: `~/.tinypngrc`
4. **Interactive prompt**: If none of the above

### Environment Variables

| Variable          | Description                 | Example            |
| ----------------- | --------------------------- | ------------------ |
| `TINYPNG_API_KEY` | API key(s), comma-separated | `"key1,key2,key3"` |

## Examples

### Compress All Images in Directory

```javascript
import { TinyPNGCompressor } from 'tiny-png'
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
import { TinyPNGCompressor } from 'tiny-png'
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

**Test Coverage:**

- ✅ 158 tests passing
- ✅ Unit tests for all core functionality
- ✅ Integration tests with real API (optional)
- ✅ Stream processing tests
- ✅ Error handling tests

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

## Troubleshooting

### "API key is required"

**Solution:** Configure your API key:

```bash
tinypng config
# Or
export TINYPNG_API_KEY="your-key"
```

### "Unauthorized: Your credentials are invalid"

**Causes:**

- Invalid API key format
- Network connectivity issues
- API key revoked

**Solution:** Get a valid API key from [TinyPNG Developer API](https://tinypng.com/developers)

### "Too Many Requests"

**Cause:** Monthly quota (500 compressions/key) exhausted

**Solution:** Add more API keys or wait until next month:

```bash
tinypng config  # Add more keys
```

### "Image requires flattening to convert to 'image/jpeg'"

**Cause:** JPEG doesn't support transparency

**Solution:** Use WebP or PNG format instead:

```bash
tinypng cv image.png -f webp  # ✅ Supports transparency
```

### "No files matched pattern"

**Causes:**

- Glob pattern doesn't match any files
- Files don't have supported extensions

**Solution:** Check your file patterns:

```bash
# List files first
ls *.png

# Then compress
tinypng c *.png
```

## API Reference

For detailed API documentation, see:

- [CLI_README.md](./CLI_README.md) - Complete CLI documentation
- [CLI_QUICK_START.md](./CLI_QUICK_START.md) - Quick reference guide
- [TypeScript Definitions](./src/tinypng.d.ts) - Full type definitions

## Related Documentation

- 📚 [CLI Implementation Summary](./CLI_IMPLEMENTATION_SUMMARY.md)
- 🔄 [Convert Feature Summary](./CONVERT_FEATURE_SUMMARY.md)
- 📊 [Quota Display Enhancement](./QUOTA_DISPLAY_ENHANCEMENT.md)
- 🌐 [TinyPNG API Reference](https://tinypng.com/developers/reference)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for your changes
4. Ensure all tests pass: `npm test`
5. Format code: `npm run format`
6. Commit changes: `git commit -am 'Add my feature'`
7. Push to the branch: `git push origin feature/my-feature`
8. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd tiny-png

# Install dependencies
npm install

# Run tests
npm test

# Link CLI locally
npm link

# Try it out
tinypng --help
```

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Acknowledgments

- [TinyPNG](https://tinypng.com/) for the excellent image compression API
- Built with ❤️ using Node.js, Vitest, Commander.js, and Chalk

## Support

- 📖 [Documentation](./CLI_README.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 🌐 [TinyPNG API Support](https://tinypng.com/developers/support)

## Changelog

### v1.0.0 (Current)

- ✨ Initial release
- 🗜️ Image compression (PNG, JPEG, WebP, AVIF)
- 🔄 Format conversion
- 📐 Intelligent resizing (scale, fit, cover, thumb)
- 🔑 Multiple API key support with smart rotation
- 💻 Full-featured CLI with beautiful output
- 📊 Enhanced quota tracking and warnings
- 🎯 Batch processing with progress tracking
- 📚 Comprehensive documentation and examples
- ✅ Extensive test coverage

---

**Get your free API key at [tinypng.com/developers](https://tinypng.com/developers)**

**Made with ❤️ for the web development community**
