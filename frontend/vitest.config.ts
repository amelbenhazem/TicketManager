import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'e2e/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    coverage: {
      provider: 'v8',
      // SonarQube lit le LCOV via `frontend/coverage/lcov.info`
      reporter: ['text', 'html', 'lcov'],
    },
  },
})

