import { defineConfig } from "vitest/config";

export default defineConfig({
  // The action-registry source lives outside this drop-in's directory and
  // resolves `react` through the worktree-root `node_modules/`. The harness
  // installs its own React in `node_modules/` here. Without dedupe the two
  // Reacts collide ("Cannot read properties of null reading 'useRef'") at
  // the moment a context-using component renders. Same fix the root
  // `vite.config.ts` applies for the same reason.
  resolve: {
    dedupe: ["react", "react-dom", "@base-ui/react"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "keyboard-shortcuts.tsx",
        "parse.ts",
        "format.ts",
      ],
      reporter: ["text", "json-summary"],
    },
  },
});
