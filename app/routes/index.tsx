import { Link } from "react-router";

const ENTRIES: ReadonlyArray<{ to: string; label: string; blurb: string }> = [
  {
    to: "/color-scheme",
    label: "useColorScheme",
    blurb: "Light/dark color scheme hook with SSR FOUC blocker.",
  },
  {
    to: "/action-registry",
    label: "action-registry",
    blurb: "Shared registry that the keybinding hook and command palette subscribe to.",
  },
  {
    to: "/search-facets",
    label: "SearchFacets",
    blurb: "Schema-driven faceted search bar with Gmail-flavor grammar.",
  },
  {
    to: "/keyboard-shortcuts",
    label: "KeyboardShortcuts",
    blurb: "Keybinding layer + cheatsheet that consume the action registry.",
  },
  {
    to: "/command-palette",
    label: "CommandPalette",
    blurb: "⌘K launcher built on cmdk with async sources.",
  },
  {
    to: "/integration",
    label: "Integration demo",
    blurb: "All three action drop-ins wired together end-to-end.",
  },
];

export default function IndexRoute() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          react-kit
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          Lightweight, copy-paste React hooks and components for common
          frontend patterns. Each entry below is a self-contained drop-in
          with its own README and verification harness — no npm install,
          no build step, just copy the folder.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <li key={entry.to}>
            <Link
              to={entry.to}
              className="border-border bg-card hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
            >
              <h2 className="text-base font-semibold">{entry.label}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {entry.blurb}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
