import { NavLink, Outlet } from "react-router";
import { repoRootUrl } from "~/lib/github";

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
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            href={repoRootUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub →
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
                      className="text-muted-foreground px-3 py-1.5 text-sm"
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
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
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
