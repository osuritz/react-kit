import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Each drop-in folder under src/{hooks,components}/<name>/ ships its own
// isolated test harness (its own package.json with React 18 in devDeps), so
// `node_modules/` exists *inside* `src/`. Without dedupe, Vite walks up from
// a drop-in source file and resolves `react` / `react-dom` / `react-day-picker`
// from the harness's nested install instead of the root — producing two
// copies of React and the "A React Element from an older version of React was
// rendered" runtime error.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom", "react-day-picker"],
  },
});
