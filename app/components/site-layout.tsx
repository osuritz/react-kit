import { NavLink, Outlet } from "react-router";
import { repoRootUrl } from "~/lib/github";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

interface NavGroup {
  heading: string;
  items: ReadonlyArray<{ to: string; label: string }>;
}

const NAV: ReadonlyArray<NavGroup> = [
  {
    heading: "Hooks",
    items: [
      { to: "/color-scheme", label: "useColorScheme" },
      { to: "/action-registry", label: "action-registry" },
    ],
  },
  {
    heading: "Components",
    items: [
      { to: "/search-facets", label: "SearchFacets" },
      { to: "/keyboard-shortcuts", label: "KeyboardShortcuts" },
      { to: "/command-palette", label: "CommandPalette" },
    ],
  },
  {
    heading: "Sparklines",
    items: [
      { to: "/sparkline-line", label: "SparklineLine" },
      { to: "/sparkline-area", label: "SparklineArea" },
      { to: "/sparkline-bar", label: "SparklineBar" },
      { to: "/sparkline-winloss", label: "SparklineWinLoss" },
      { to: "/sparkline-threshold", label: "SparklineThreshold" },
      { to: "/bullet-graph", label: "BulletGraph" },
      { to: "/stacked-bar", label: "StackedBar" },
      { to: "/gauge-ring", label: "GaugeRing" },
      { to: "/heat-strip", label: "HeatStrip" },
      { to: "/delta-chip", label: "DeltaChip" },
    ],
  },
  {
    heading: "Demos",
    items: [
      { to: "/sparkline-dashboard", label: "Sparkline dashboard" },
      { to: "/integration", label: "Integration" },
    ],
  },
];

export function SiteLayout() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <NavLink
            to="/"
            className="text-base font-semibold tracking-tight hover:opacity-80"
          >
            react-kit
          </NavLink>
          <a
            className="text-foreground hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            href={repoRootUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon className="size-5" />
            GitHub
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-8 md:py-12">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-48 shrink-0 overflow-y-auto md:block">
          <nav aria-label="Primary">
            <ul className="flex flex-col gap-4">
              {NAV.map((group) => {
                const labelId = `nav-group-${group.heading.toLowerCase()}`;
                return (
                  <li key={group.heading} className="flex flex-col">
                    <div
                      id={labelId}
                      className="text-muted-foreground px-3 py-1.5 text-xs font-medium"
                    >
                      {group.heading}
                    </div>
                    <ul aria-labelledby={labelId} className="flex flex-col">
                      {group.items.map((item) => (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end
                            className={({ isActive }) =>
                              [
                                "block rounded-md px-3 py-1.5 text-sm transition-colors",
                                isActive
                                  ? "bg-accent text-foreground ring-1 ring-inset ring-border"
                                  : "text-foreground/85 hover:text-foreground hover:bg-accent",
                              ].join(" ")
                            }
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
