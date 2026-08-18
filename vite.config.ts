/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Matches the old `homepage` field - the site is served from
  // https://carpiediem.github.io/wordleb0t/, so assets need the subpath prefix.
  base: '/wordleb0t/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // Keep CRA's output directory so `gh-pages -d build` and any CI steps keep working.
    outDir: 'build',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      // lcov is what the Codecov upload step in CI reads.
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
