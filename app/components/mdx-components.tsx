import type { ComponentPropsWithoutRef } from 'react';
import type { MDXComponents } from 'mdx/types';
import { DemoCard } from './demo-card';

/**
 * Components made available to every MDX page without an explicit import.
 *
 * `DemoCard` is the live-preview + highlighted-source primitive that pages
 * embed; the lowercase entries restyle the handful of Markdown elements a page
 * body might use (prose paragraphs, inline code, links, headings, lists) with
 * the site's theme tokens so authored prose matches the rest of the chrome.
 *
 * The `as MDXComponents` cast bridges a known mismatch: `@types/mdx` still types
 * element overrides with React's legacy (string-allowing) `ref`, which React
 * 19's element props no longer accept. Params use React 19 types so the bodies
 * stay sound; only the outer shape is asserted.
 */
export const mdxComponents = {
  DemoCard,
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-muted-foreground max-w-2xl text-sm md:text-base" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="text-primary underline-offset-4 hover:underline" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-xl font-semibold" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-base font-semibold" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="text-muted-foreground max-w-2xl list-disc space-y-1 pl-5 text-sm" {...props} />
  ),
} as MDXComponents;
