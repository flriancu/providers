import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths: the same build works at a subdomain's root and under a sub-path.
  base: './',
  plugins: [react()],
  build: {
    // Only the app. spike.html (the Phase 0b sharing test) is served by the dev server alone.
    rollupOptions: { input: 'index.html' },
  },
  test: {
    // Playwright specs live in tests/e2e.
    include: ['tests/unit/**/*.test.ts'],
  },
});
