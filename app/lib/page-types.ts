/**
 * Shared types for the MDX-authored drop-in pages.
 *
 * Each page in `app/routes/*.mdx` declares a `PageFrontmatter` block. The
 * router table and the navigation (`NAV_GROUPS`) are both generated from those
 * blocks in `./pages`, so a page's frontmatter is the single place its title,
 * nav group, ordering, and GitHub links are defined.
 */
export type PageGroup = 'Hooks' | 'Components' | 'Sparklines' | 'Demos';

export interface PageFrontmatter {
  /** Page heading; also used verbatim as the sidebar/drawer/home-card label. */
  title: string;
  /** Which navigation group the page belongs to. */
  group: PageGroup;
  /** Sort order within the group, ascending. */
  order: number;
  /** One-line summary shown on the home-page card. */
  blurb: string;
  /** Lead paragraph rendered under the title. */
  description?: string;
  /**
   * Drop-in folder under the repo root (e.g. `src/components/sparkline/delta-chip`).
   * When set, the header links to its `README.md` and its source tree on GitHub.
   */
  dropInPath?: string;
  /**
   * A single "view source" path under the repo root, for hand-rolled demo
   * pages whose source lives in `app/` rather than a drop-in folder
   * (e.g. the integration page).
   */
  appSourcePath?: string;
}

export interface NavItem {
  to: string;
  /** Used as both the sidebar/drawer link text and the home-card heading. */
  label: string;
  /** One-line summary shown on the home-page card. */
  blurb: string;
}

export interface NavGroup {
  heading: string;
  items: ReadonlyArray<NavItem>;
}
