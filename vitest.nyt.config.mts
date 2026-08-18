/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// A dedicated config for the slow NYT answers simulation, which the main
// vite.config.ts excludes from the regular `npm test` run.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/nytAnswers.test.ts'],
  },
});
