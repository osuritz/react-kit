import { defineConfig } from 'vitest/config';

export default defineConfig({
  // This directory installs its own React into a nested `node_modules/`, but
  // imports the shared `lib/` helpers by relative path. Dedupe React so a
  // hook-using render can't collide two copies of React.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['sparkline-line.tsx', 'lib/scale.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
