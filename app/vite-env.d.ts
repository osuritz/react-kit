/// <reference types="vite/client" />

declare module '*?shiki' {
  const src: import('~/lib/shiki-source').HighlightedSource;
  export default src;
}

declare module '*.mdx' {
  export const frontmatter: import('~/lib/page-types').PageFrontmatter;
  const MDXContent: (props: {
    components?: import('mdx/types').MDXComponents;
  }) => import('react').ReactElement;
  export default MDXContent;
}
