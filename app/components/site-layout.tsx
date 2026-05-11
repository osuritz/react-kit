import { NavLink, Outlet } from "react-router";

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
    heading: "Demos",
    items: [{ to: "/integration", label: "Integration" }],
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
            href="https://github.com/osuritz/react-kit"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub →
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-8 md:py-12">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-48 shrink-0 overflow-y-auto md:block">
          <nav aria-label="Primary" className="flex flex-col gap-6">
            {NAV.map((group) => (
              <div key={group.heading} className="flex flex-col gap-1.5">
                <h2 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
                  {group.heading}
                </h2>
                <ul className="flex flex-col">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          [
                            "block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors",
                            isActive
                              ? "border-foreground text-foreground bg-muted/50"
                              : "text-muted-foreground hover:text-foreground border-transparent",
                          ].join(" ")
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
