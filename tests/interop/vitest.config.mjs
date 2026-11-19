// Runs the spreadsheet round trips (tests/interop) on their own: they need Excel for Windows, so
// neither the unit tests (vite.config.ts) nor CI include them.
// Run: npx vitest run --config tests/interop/vitest.config.mjs
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    include: ['tests/interop/*.test.ts'],
    // Show what changed in the lossy files also when the tests pass.
    silent: false,
    // Excel takes a few seconds to start and to save each file.
    hookTimeout: 180_000,
  },
});
