import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Config for renderer tests (jsdom environment with Svelte browser build)
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser', 'default']
  },
  test: {
    environment: 'jsdom',
    include: ['src/renderer/**/*.test.ts'],
    globals: true
  }
})
