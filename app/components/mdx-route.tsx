import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';
import type { PageFrontmatter } from '~/lib/page-types';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';
import { mdxComponents } from './mdx-components';

interface PageLink {
  href: string;
  label: string;
}

/**
 * Header links derived from frontmatter: a drop-in page links to its README +
 * source tree; a hand-rolled demo page links to its single `app/` source file.
 */
function pageLinks(frontmatter: PageFrontmatter): ReadonlyArray<PageLink> {
  if (frontmatter.dropInPath) {
    return [
      { href: repoBlobUrl(`${frontmatter.dropInPath}/README.md`), label: 'README →' },
      { href: repoTreeUrl(frontmatter.dropInPath), label: 'Source on GitHub →' },
    ];
  }
  if (frontmatter.appSourcePath) {
    return [{ href: repoBlobUrl(frontmatter.appSourcePath), label: 'View source on GitHub →' }];
  }
  return [];
}

export interface MdxRouteProps {
  frontmatter: PageFrontmatter;
  Component: ComponentType<{ components?: MDXComponents }>;
}

/**
 * The shared chrome around every MDX page: the title, lead description, and
 * GitHub links from frontmatter, followed by the page body (one or more
 * `<DemoCard>`s) rendered with the shared MDX component set.
 */
export function MdxRoute({ frontmatter, Component }: MdxRouteProps) {
  const links = pageLinks(frontmatter);
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{frontmatter.title}</h1>
        {frontmatter.description && (
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            {frontmatter.description}
          </p>
        )}
        {links.length > 0 && (
          <p className="flex gap-4 text-sm">
            {links.map((link) => (
              <a
                key={link.href}
                className="text-primary underline-offset-4 hover:underline"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6">
        <Component components={mdxComponents} />
      </div>
    </article>
  );
}
