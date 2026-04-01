import { defineConfig } from 'vitest/config'

// Config for main process tests (Node environment)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts', 'src/preload/**/*.test.ts'],
    globals: true
  }
})
