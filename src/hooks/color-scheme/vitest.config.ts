import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["color-scheme.tsx", "fouc-blocker.ts"],
      reporter: ["text", "json-summary"],
    },
  },
});
