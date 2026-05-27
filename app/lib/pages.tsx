import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';
import type { RouteObject } from 'react-router';
import { MdxRoute } from '~/components/mdx-route';
import type { NavGroup, PageFrontmatter, PageGroup } from './page-types';

interface MdxModule {
  default: ComponentType<{ components?: MDXComponents }>;
  frontmatter: PageFrontmatter;
}

interface Page {
  /** Route path / filename without extension, e.g. `delta-chip`. */
  slug: string;
  frontmatter: PageFrontmatter;
  Component: MdxModule['default'];
}

// Order groups appear in the sidebar and home grid. Pages whose `group` is not
// listed here are dropped (with a dev warning) rather than rendered loose.
const GROUP_ORDER: ReadonlyArray<PageGroup> = ['Hooks', 'Components', 'Sparklines', 'Demos'];

const modules = import.meta.glob<MdxModule>('../routes/*.mdx', { eager: true });

const pages: ReadonlyArray<Page> = Object.entries(modules).map(([path, mod]) => {
  const slug = path
    .split('/')
    .pop()!
    .replace(/\.mdx$/, '');
  const { frontmatter } = mod;
  const missing = [
    frontmatter?.title ? null : 'title',
    frontmatter?.group ? null : 'group',
    typeof frontmatter?.order === 'number' ? null : 'order',
    frontmatter?.blurb ? null : 'blurb',
  ].filter((field) => field !== null);
  if (missing.length > 0) {
    throw new Error(
      `app/routes/${slug}.mdx is missing required frontmatter: ${missing.join(', ')}. ` +
        `Every drop-in page needs title, group, order, and blurb.`
    );
  }
  return { slug, frontmatter, Component: mod.default };
});

/** Route entries for the data router, one per `app/routes/*.mdx`. */
export const routeChildren: ReadonlyArray<RouteObject> = pages.map((page) => ({
  path: page.slug,
  element: <MdxRoute frontmatter={page.frontmatter} Component={page.Component} />,
}));

/**
 * Navigation groups for the sidebar, mobile drawer, and home grid — grouped by
 * `frontmatter.group` in `GROUP_ORDER`, sorted by `frontmatter.order`. The
 * route path is the filename, so `to` can never point at a missing route.
 */
export const navGroups: ReadonlyArray<NavGroup> = GROUP_ORDER.map((heading) => ({
  heading,
  items: pages
    .filter((page) => page.frontmatter.group === heading)
    .sort((a, b) => a.frontmatter.order - b.frontmatter.order)
    .map((page) => ({
      to: `/${page.slug}`,
      label: page.frontmatter.title,
      blurb: page.frontmatter.blurb,
    })),
})).filter((group) => group.items.length > 0);
