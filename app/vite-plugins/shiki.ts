import fs from "node:fs/promises";
import type { Plugin } from "vite";
import {
  createHighlighter,
  createCssVariablesTheme,
  type Highlighter,
} from "shiki";

const QUERY = "?shiki";

const theme = createCssVariablesTheme({
  name: "shadcn",
  variablePrefix: "--shiki-",
});

let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    langs: ["tsx"],
    themes: [theme],
  });
  return highlighterPromise;
}

export function shiki(): Plugin {
  return {
    name: "react-kit:shiki",
    async load(id) {
      if (!id.endsWith(QUERY)) return null;

      const filepath = id.slice(0, -QUERY.length);
      const raw = await fs.readFile(filepath, "utf8");

      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(raw, {
        lang: "tsx",
        theme: "shadcn",
      });

      this.addWatchFile(filepath);

      return `export default ${JSON.stringify({
        raw,
        html,
        lang: "tsx",
      })};`;
    },
  };
}
