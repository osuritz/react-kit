import * as React from "react";
import {
  Cog,
  FileText,
  HelpCircle,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { Button } from "~/components/ui/button.tsx";
import {
  ActionsProvider,
  useAction,
  type Action,
} from "#hooks/action-registry/actions.tsx";
import {
  CommandPalette,
  type CommandSource,
} from "#components/command-palette/command-palette.tsx";

/**
 * Demo for the command-palette drop-in. Wraps an `<ActionsProvider>` so
 * the palette has its own isolated registry on the demo page, registers a
 * handful of actions across a few groups, and wires one async source
 * (`Search docs`) that returns fake results after a 350ms delay so the
 * loading row is visible.
 */
export function CommandPaletteDemo() {
  return (
    <ActionsProvider>
      <DemoBody />
    </ActionsProvider>
  );
}

function DemoBody() {
  const [open, setOpen] = React.useState(false);
  const [scheme, setScheme] = React.useState<"light" | "dark">("light");
  const [log, setLog] = React.useState<string[]>([]);
  const append = React.useCallback((line: string) => {
    setLog((prev) =>
      [`${new Date().toLocaleTimeString()} — ${line}`, ...prev].slice(0, 6),
    );
  }, []);

  // Five registered actions across three groups, with a mix of
  // shortcuts/keywords/icons so every row variant is exercised.
  useAction({
    id: "nav.search",
    label: "Search…",
    group: "Navigation",
    shortcut: "mod+k",
    keywords: ["find", "command", "palette"],
    icon: <Search />,
    run: () => append("ran nav.search"),
  });
  useAction({
    id: "nav.settings",
    label: "Open Settings",
    group: "Navigation",
    shortcut: "mod+,",
    keywords: ["preferences", "config"],
    icon: <Cog />,
    run: () => append("ran nav.settings"),
  });
  useAction({
    id: "doc.new",
    label: "New document",
    group: "Documents",
    shortcut: "mod+n",
    keywords: ["create", "blank", "file"],
    icon: <Plus />,
    run: () => append("ran doc.new"),
  });
  useAction({
    id: "theme.toggle",
    label: scheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
    group: "Preferences",
    keywords: ["theme", "dark", "light", "color", "scheme"],
    icon: scheme === "dark" ? <Sun /> : <Moon />,
    run: () => {
      const next = scheme === "dark" ? "light" : "dark";
      setScheme(next);
      append(`switched theme → ${next}`);
    },
  });
  useAction({
    id: "session.signout",
    label: "Sign out",
    group: "Account",
    keywords: ["logout", "log out", "exit"],
    icon: <LogOut />,
    enabled: () => true,
    run: () => append("ran session.signout"),
  });
  useAction({
    id: "help.shortcuts",
    label: "Show keyboard shortcuts",
    group: "Help",
    shortcut: "?",
    icon: <HelpCircle />,
    run: () => append("ran help.shortcuts"),
  });

  // Fake async source: a search-docs endpoint that returns 0–3 results
  // matching the query after a 350ms delay. The delay is intentionally
  // longer than the default 150ms debounce so the loading row is
  // visible.
  const searchDocs = React.useMemo<CommandSource>(
    () => ({
      id: "docs",
      heading: "Search docs",
      search: (query, signal) =>
        new Promise<Action[]>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            const lc = query.toLowerCase();
            const hits = FAKE_DOCS.filter((d) =>
              d.toLowerCase().includes(lc),
            ).slice(0, 5);
            resolve(
              hits.map<Action>((title) => ({
                id: `docs:${title}`,
                label: title,
                icon: <FileText />,
                run: () => append(`opened doc “${title}”`),
              })),
            );
          }, 350);
          signal.addEventListener("abort", () => {
            window.clearTimeout(timer);
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    }),
    [append],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpen(true)}>Open palette</Button>
        <p className="text-muted-foreground text-xs">
          Or press <ModKbd>K</ModKbd> from anywhere on the page. Try typing
          “theme”, “sign”, or “onboarding” (the last hits the async docs
          source).
        </p>
      </div>

      <section className="border-border bg-muted/30 flex flex-col gap-2 rounded-md border px-3 py-2.5">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Activity
        </h3>
        {log.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Run an action — its log line shows up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 font-mono text-[11px]">
            {log.map((line, i) => (
              <li
                key={i}
                className={i === 0 ? "text-foreground" : "text-muted-foreground"}
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        sources={[searchDocs]}
        placeholder="Search actions, docs, anything…"
      />
    </div>
  );
}

const FAKE_DOCS = [
  "Onboarding — getting started",
  "Onboarding — invite teammates",
  "Settings — billing & invoices",
  "API keys & webhooks",
  "Release notes",
  "Troubleshooting common issues",
  "Account recovery",
];

function ModKbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <kbd className="border-border bg-muted text-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium shadow-xs">
        ⌘
      </kbd>
      <kbd className="border-border bg-muted text-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium shadow-xs">
        {children}
      </kbd>
    </span>
  );
}
