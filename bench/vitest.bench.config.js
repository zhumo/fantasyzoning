import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    benchmark: {
      include: ['bench/benchmarks/**/*.bench.js'],
    },
    testTimeout: 120000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
})
