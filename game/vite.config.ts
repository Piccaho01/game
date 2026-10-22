import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Relative base so the build works from a GitHub Pages project subpath.
  base: './',
  server: {
    // Sprites are read straight from the art pipeline output in ../art.
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
});
