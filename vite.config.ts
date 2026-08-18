/// <reference types="vitest/config" />
import { defineConfig, configDefaults } from 'vitest/config';
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
    // Runs separately, via `npm run test:nyt` - it's slow, and only relevant when
    // guess.ts or its dependencies change (see .github/workflows/nyt-answers.yml).
    exclude: [...configDefaults.exclude, 'src/lib/nytAnswers.test.ts'],
    coverage: {
      // lcov is what the Codecov upload step in CI reads.
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
