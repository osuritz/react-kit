/**
 * Single source of truth for site navigation.
 *
 * The sidebar (desktop), the mobile drawer, and the home-page grid all derive
 * from this one list, so they can never drift apart — adding a drop-in here
 * surfaces it in every navigation surface at once. (A new sparkline family was
 * once added to the sidebar but not the home grid, which left it invisible on
 * mobile, where the sidebar is hidden.)
 *
 * Every `to` must match a route in `app/router.tsx`.
 */
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

export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    heading: 'Hooks',
    items: [
      {
        to: '/color-scheme',
        label: 'useColorScheme',
        blurb: 'Light/dark color scheme hook with SSR FOUC blocker.',
      },
      {
        to: '/use-clipboard',
        label: 'useClipboard',
        blurb: 'Copy-to-clipboard hook with auto-resetting copied state and execCommand fallback.',
      },
      {
        to: '/action-registry',
        label: 'action-registry',
        blurb: 'Shared registry that the keybinding hook and command palette subscribe to.',
      },
    ],
  },
  {
    heading: 'Components',
    items: [
      {
        to: '/search-facets',
        label: 'SearchFacets',
        blurb: 'Schema-driven faceted search bar with Gmail-flavor grammar.',
      },
      {
        to: '/keyboard-shortcuts',
        label: 'KeyboardShortcuts',
        blurb: 'Keybinding layer + cheatsheet that consume the action registry.',
      },
      {
        to: '/command-palette',
        label: 'CommandPalette',
        blurb: '⌘K launcher built on Base UI with async sources.',
      },
    ],
  },
  {
    heading: 'Sparklines',
    items: [
      {
        to: '/sparkline-line',
        label: 'SparklineLine',
        blurb: 'Axis-less trend line for tables, KPI cards, and dense dashboards.',
      },
      {
        to: '/sparkline-area',
        label: 'SparklineArea',
        blurb: 'Trend line with a soft fill for emphasising magnitude or volume.',
      },
      {
        to: '/sparkline-bar',
        label: 'SparklineBar',
        blurb: 'Column sparkline for discrete per-period values; negatives turn destructive.',
      },
      {
        to: '/sparkline-winloss',
        label: 'SparklineWinLoss',
        blurb: 'Equal-height up/down ticks for binary outcomes — the pattern is the point.',
      },
      {
        to: '/sparkline-threshold',
        label: 'SparklineThreshold',
        blurb: 'Monitoring line with an acceptable band and a dashed limit; breaches are marked.',
      },
      {
        to: '/bullet-graph',
        label: 'BulletGraph',
        blurb: "Tufte's compact actual-vs-target bar with qualitative bands.",
      },
      {
        to: '/stacked-bar',
        label: 'StackedBar',
        blurb: 'Single-row part-to-whole bar for composition and breakdowns.',
      },
      {
        to: '/gauge-ring',
        label: 'GaugeRing',
        blurb: 'A single percentage as a donut — quota, completion, or health score.',
      },
      {
        to: '/heat-strip',
        label: 'HeatStrip',
        blurb: 'A row of cells whose opacity encodes intensity — no multi-hue scale.',
      },
      {
        to: '/delta-chip',
        label: 'DeltaChip',
        blurb: 'The tiny ▲ +12% / ▼ −4% change indicator that pairs with a metric.',
      },
    ],
  },
  {
    heading: 'Demos',
    items: [
      {
        to: '/sparkline-dashboard',
        label: 'Sparkline dashboard',
        blurb: 'The whole micro-chart family composed into one enterprise dashboard.',
      },
      {
        to: '/integration',
        label: 'Integration',
        blurb: 'All three action drop-ins wired together end-to-end.',
      },
    ],
  },
];
