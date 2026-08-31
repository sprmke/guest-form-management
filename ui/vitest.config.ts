import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Unit tests only (pure logic). No DOM env — the DOM-touching orchestrator
// (`optimizeImage`) is exercised by the Playwright quality/perf checks, not here.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*Test.ts', 'src/**/*.test.ts'],
    passWithNoTests: false,
  },
});
