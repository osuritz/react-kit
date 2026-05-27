import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { shiki } from './app/vite-plugins/shiki';
import { fileURLToPath, URL } from 'node:url';

// Each drop-in folder under src/{hooks,components}/<name>/ ships its own
// isolated test harness (its own package.json with React 18 in devDeps), so
// `node_modules/` exists *inside* `src/`. Without dedupe, Vite walks up from
// a drop-in source file and resolves shared packages from the harness's
// nested install instead of the root.
//
// `react` / `react-dom` produce a hard "A React Element from an older version
// of React was rendered" runtime error when duplicated. `@base-ui/react`,
// `react-day-picker`, `react-router`, and any other Context-using library
// would fail more silently — Combobox items would not register with their
// root, popovers would not anchor, route navigation would not propagate — so
// dedupe them too.
export default defineConfig({
  base: '/react-kit/',
  plugins: [
    // MDX must run before the React plugin (so it can transform the JSX that
    // MDX emits) and frontmatter must be parsed into a `frontmatter` export
    // for the generated router/nav in `app/lib/pages`.
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] }) },
    react({ include: /\.(?:jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    shiki(),
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', '@base-ui/react', 'react-day-picker', 'react-router'],
  },
});
