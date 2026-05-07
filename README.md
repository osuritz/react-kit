# react-kit

A collection of reusable React hooks and utilities for common frontend patterns.
Copy what you need, no dependencies required (mostly).
MIT licensed.

## Why this exists

You end up rewriting the same hooks and utilities across projects. This is a place to keep the ones that actually work.

## How to use

Each hook/utility is self-contained. Copy the file(s) you need into your project. Check the peer dependencies and any external requirements at the top of each file.

## What's in here

### Hooks

- **[color-scheme](src/hooks/color-scheme/README.md)** — drop-in `light`/`dark`
  color scheme hook. Provider-less by default, configurable storage and DOM
  strategy, ships an SSR FOUC-blocker script. Reach for it when JS needs to
  branch on the scheme (theme toggle, icon/chart swaps); pure CSS theming
  doesn't need it.

### Components

Reusable component patterns — coming soon.

## License

MIT
