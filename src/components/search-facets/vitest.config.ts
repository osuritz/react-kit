import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "search-facets.tsx",
        "chip-strip.tsx",
        "builder-popover.tsx",
        "use-search-facets.ts",
        "use-query-param-sync.ts",
        "grammar/**/*.ts",
        "editors/**/*.tsx",
      ],
      reporter: ["text", "json-summary"],
    },
  },
});
