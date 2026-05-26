/// <reference types="vite/client" />

declare module '*?shiki' {
  const src: import('~/lib/shiki-source').HighlightedSource;
  export default src;
}
