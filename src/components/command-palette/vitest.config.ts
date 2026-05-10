import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same dedupe story as the other drop-ins: this directory installs its
  // own React 18 in `node_modules/`, but the action-registry source it
  // imports from `../../hooks/action-registry/` resolves React through the
  // worktree-root install. Without dedupe, the two Reacts collide the
  // moment a context-using component renders.
  resolve: {
    dedupe: ["react", "react-dom", "cmdk"],
  },
  test: {
    environment: "jsdom",
    // jsdom only initializes `localStorage` when the document is given a
    // real origin. Without an `environmentOptions.jsdom.url`, accesses to
    // `localStorage` throw "SecurityError" or surface as `undefined`
    // depending on jsdom version. Pin a stable origin for tests.
    environmentOptions: {
      jsdom: { url: "http://localhost/" },
    },
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["command-palette.tsx", "format-shortcut.ts"],
      reporter: ["text", "json-summary"],
    },
  },
});
