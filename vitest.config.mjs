import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Enable globals (describe, it, expect)
    globals: true,

    // Test patterns
    include: ['src/**/*.test.mjs', 'src/**/*.spec.mjs'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/tinypng.test.mjs'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.mjs'],
      exclude: [
        'src/**/*.test.mjs',
        'src/**/*.spec.mjs',
        'src/config.mjs',
        'src/config.example.mjs',
        'src/**/*.d.ts',
      ],
    },

    // Test timeout (longer for integration tests)
    testTimeout: 30000,

    // Reporters
    reporters: ['verbose'],

    // Run tests sequentially to avoid API rate limits
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Fail fast on first error (optional)
    bail: 0,

    // Silent console output from tests
    silent: false,

    // Watch mode settings
    watch: false,

    // Setup files (if needed)
    // setupFiles: ['./test/setup.js'],
  },
})
