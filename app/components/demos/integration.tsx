import * as React from "react";
import {
  BookOpen,
  Cog,
  FileDown,
  FilePlus,
  Hand,
  Home,
  Info,
  LogIn,
  Moon,
  Save,
  Send,
  Sun,
  User,
} from "lucide-react";
import { Button } from "~/components/ui/button.tsx";
import {
  ActionsProvider,
  useAction,
  useActions,
  type Action,
  type ActionRunContext,
} from "#hooks/action-registry/actions.tsx";
import {
  ShortcutCheatsheet,
  ShortcutsProvider,
} from "#components/keyboard-shortcuts/keyboard-shortcuts.tsx";
import {
  CommandPalette,
  type CommandSource,
} from "#components/command-palette/command-palette.tsx";
import { useColorScheme } from "#hooks/color-scheme/color-scheme.tsx";

/**
 * Wires action-registry, keyboard-shortcuts, and command-palette into a
 * single page. Every interaction logs `<id> fired (source=…)` so the user
 * can verify that each surface reports itself correctly through `ctx.source`.
 */
export function IntegrationDemo() {
  return (
    <ActionsProvider>
      <ShortcutsProvider>
        <Body />
      </ShortcutsProvider>
    </ActionsProvider>
  );
}

const SEAMS: ReadonlyArray<string> = [
  "shortcut fires nav.home (try `g h`) — log shows source=shortcut",
  "palette fires the same nav.home (open palette, click row) — log shows source=palette",
  "cheatsheet (Show cheatsheet button, or palette → Show keyboard shortcuts) lists nav.home with `g h` rendered with the platform glyph",
  "demo.disabled (cheatsheet) — uncheck the box and the row greys live, even with the cheatsheet already open (Body re-renders → cheatsheet rows re-evaluate enabled() per render)",
  "demo.disabled (palette) — uncheck the box and the row disappears, but only after closing and reopening the palette (its enabledActions is memoized on registry snapshot identity, not on enabled() value — registry doesn't fire subscribers on field changes)",
  "Mount child off → child.greet / child.ping disappear from palette and cheatsheet without stale entries",
  "Focus the input: typing fires neither mod+n (no allowInInput) nor any other letter chord, while mod+s still fires (allowInInput: true)",
  "palette opens via the “Open palette” button — log shows palette.open fired (source=click) (in a real app, palette.open would also own mod+k; we omit the chord here to avoid colliding with the standalone command-palette demo on the same page)",
  'Open the palette and type "anything" — three "Docs:" rows appear after a brief debounce; selecting one logs source=palette',
];

function Body() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = React.useState(false);
  const [demoEnabled, setDemoEnabled] = React.useState(true);
  const [mountChild, setMountChild] = React.useState(true);
  const [log, setLog] = React.useState<string[]>([]);

  const append = React.useCallback((line: string) => {
    setLog((prev) =>
      [`${new Date().toLocaleTimeString()} — ${line}`, ...prev].slice(0, 50),
    );
  }, []);

  const fired = React.useCallback(
    (id: string) => (ctx: ActionRunContext) => {
      append(`${id} fired (source=${ctx.source ?? "unknown"})`);
    },
    [append],
  );

  const { colorScheme, setColorScheme } = useColorScheme();

  // ---------------------------------------------------------------- Navigation
  useAction({
    id: "nav.home",
    label: "Go home",
    group: "Navigation",
    shortcut: "g h",
    icon: <Home className="size-4" />,
    run: fired("nav.home"),
  });
  useAction({
    id: "nav.settings",
    label: "Open Settings",
    group: "Navigation",
    shortcut: "g s",
    icon: <Cog className="size-4" />,
    run: fired("nav.settings"),
  });
  useAction({
    id: "nav.profile",
    label: "Open Profile",
    group: "Navigation",
    icon: <User className="size-4" />,
    run: fired("nav.profile"),
  });

  // ------------------------------------------------------------------ Editing
  useAction({
    id: "file.save",
    label: "Save",
    group: "Editing",
    shortcut: ["mod+s", "ctrl+s"],
    allowInInput: true,
    icon: <Save className="size-4" />,
    run: fired("file.save"),
  });
  useAction({
    id: "file.new",
    label: "New file",
    group: "Editing",
    shortcut: "mod+n",
    icon: <FilePlus className="size-4" />,
    run: fired("file.new"),
  });
  useAction({
    id: "file.export",
    label: "Export…",
    group: "Editing",
    icon: <FileDown className="size-4" />,
    run: fired("file.export"),
  });

  // ------------------------------------------------------------------- System
  // palette.open opens this demo's palette. The chord is intentionally
  // unbound here (and the palette's built-in hotkey is disabled below
  // with `hotkey={false}`) because this demo lives on the same index
  // page as the standalone command-palette demo, whose built-in `mod+k`
  // listener would otherwise fire alongside ours and stack two palettes.
  // In a real app you'd give this `shortcut: "mod+k"` and rely on either
  // the action OR the palette's built-in hotkey — not both. Here we just
  // route through the "Open palette" button so the click→action seam is
  // still demonstrated.
  useAction({
    id: "palette.open",
    label: "Open command palette",
    group: "System",
    icon: <Send className="size-4" />,
    run: (ctx) => {
      append(`palette.open fired (source=${ctx.source ?? "unknown"})`);
      setPaletteOpen(true);
    },
  });
  useAction({
    id: "theme.toggle",
    label: "Toggle theme",
    group: "System",
    shortcut: "t",
    icon: colorScheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />,
    run: (ctx) => {
      const next = colorScheme === "dark" ? "light" : "dark";
      void setColorScheme(next);
      append(`theme.toggle fired (source=${ctx.source ?? "unknown"}) → ${next}`);
    },
  });
  useAction({
    id: "demo.disabled",
    label: "Demo: disabled action",
    group: "System",
    shortcut: "d",
    enabled: () => demoEnabled,
    icon: <LogIn className="size-4" />,
    run: fired("demo.disabled"),
  });
  useAction({
    id: "help.about",
    label: "About",
    group: "System",
    icon: <Info className="size-4" />,
    run: fired("help.about"),
  });
  // The cheatsheet's built-in `?` binding is disabled below
  // (`shortcut={false}`) because this demo lives on the same page as the
  // standalone keyboard-shortcuts demo, and two ShortcutsProviders would
  // each handle a global `?` keystroke independently and open both
  // cheatsheets. In a real app you'd have one provider and rely on the
  // default `?`. Here we route through a registered action so the seam
  // ("a registered action toggles the cheatsheet") is still demonstrated.
  useAction({
    id: "help.cheatsheet",
    label: "Show keyboard shortcuts",
    group: "System",
    icon: <Info className="size-4" />,
    run: (ctx) => {
      append(`help.cheatsheet fired (source=${ctx.source ?? "unknown"})`);
      setCheatsheetOpen(true);
    },
  });

  // Two child actions are registered inside <ChildActions>, which mounts
  // when `mountChild` is true. Unmounting it must propagate to both
  // palette and cheatsheet — see the seams checklist.

  // Async source — Search docs.
  const docsSource = useDocsSource(append);

  // Live-list registry so the right-hand panel reflects mount/unmount.
  const { getAll, subscribe, getById } = useActions();
  const allActions = React.useSyncExternalStore(subscribe, getAll, getAll);

  return (
    <div className="flex w-full flex-col gap-5">
      {mountChild ? <ChildActions fired={fired} /> : null}

      <SeamsChecklist />

      <div className="grid gap-4 md:grid-cols-2">
        <ControlsPanel
          paletteOpenAction={getById("palette.open")}
          cheatsheetAction={getById("help.cheatsheet")}
          demoEnabled={demoEnabled}
          setDemoEnabled={setDemoEnabled}
          mountChild={mountChild}
          setMountChild={setMountChild}
          append={append}
        />
        <RegistryPanel actions={allActions} />
      </div>

      <EventLog log={log} />

      <ShortcutCheatsheet
        open={cheatsheetOpen}
        onOpenChange={setCheatsheetOpen}
        shortcut={false}
        description={
          <>
            Lists every registered action with a <code>shortcut</code>.
            Disabled rows are greyed and marked <code>aria-disabled</code>.
          </>
        }
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        hotkey={false}
        sources={[docsSource]}
        placeholder="Search actions or type a query for the docs source…"
      />
    </div>
  );
}

function ChildActions({
  fired,
}: {
  fired: (id: string) => (ctx: ActionRunContext) => void;
}) {
  useAction({
    id: "child.greet",
    label: "Greet from child",
    group: "Child",
    shortcut: "g r",
    icon: <Hand className="size-4" />,
    run: fired("child.greet"),
  });
  useAction({
    id: "child.ping",
    label: "Ping from child",
    group: "Child",
    icon: <BookOpen className="size-4" />,
    run: fired("child.ping"),
  });
  return null;
}

/* --------------------------------- panels --------------------------------- */

function SeamsChecklist() {
  return (
    <section className="border-border bg-muted/30 flex flex-col gap-2 rounded-md border px-4 py-3">
      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        Seams checklist — interact, then mark each
      </h2>
      <ul className="flex flex-col gap-1 text-xs leading-relaxed">
        {SEAMS.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden className="select-none">
              ✅ / ❌
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ControlsPanel({
  paletteOpenAction,
  cheatsheetAction,
  demoEnabled,
  setDemoEnabled,
  mountChild,
  setMountChild,
  append,
}: {
  paletteOpenAction: Action | undefined;
  cheatsheetAction: Action | undefined;
  demoEnabled: boolean;
  setDemoEnabled: (v: boolean) => void;
  mountChild: boolean;
  setMountChild: (v: boolean) => void;
  append: (line: string) => void;
}) {
  const [text, setText] = React.useState("");
  return (
    <section className="border-border bg-card flex flex-col gap-3 rounded-md border p-3">
      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        Controls
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            if (!paletteOpenAction) {
              append("palette.open not registered");
              return;
            }
            void paletteOpenAction.run({ source: "click" });
          }}
        >
          Open palette
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!cheatsheetAction) {
              append("help.cheatsheet not registered");
              return;
            }
            void cheatsheetAction.run({ source: "click" });
          }}
        >
          Show cheatsheet
        </Button>
        <span className="text-muted-foreground text-xs">
          buttons fire <code className="font-mono">palette.open</code> /{" "}
          <code className="font-mono">help.cheatsheet</code> with{" "}
          <code className="font-mono">source: "click"</code>
        </span>
      </div>
      <label className="text-muted-foreground flex flex-col gap-1 text-xs">
        Focused input — try mod+n (suppressed), mod+s (allowInInput):
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type here…"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
        />
      </label>
      <label className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={demoEnabled}
          onChange={(e) => setDemoEnabled(e.target.checked)}
          className="border-border size-3.5 rounded border"
        />
        <code className="font-mono">demo.disabled</code> enabled — uncheck to
        verify palette hides it and cheatsheet greys it
      </label>
      <label className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={mountChild}
          onChange={(e) => setMountChild(e.target.checked)}
          className="border-border size-3.5 rounded border"
        />
        Mount <code className="font-mono">child.greet</code> /{" "}
        <code className="font-mono">child.ping</code>
      </label>
    </section>
  );
}

function RegistryPanel({ actions }: { actions: ReadonlyArray<Action> }) {
  return (
    <section className="border-border bg-card flex flex-col gap-2 rounded-md border p-3">
      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        Registered actions ({actions.length})
      </h2>
      <ul className="divide-border bg-background border-border divide-y rounded-md border text-xs">
        {actions.map((a) => {
          const sc = a.shortcut
            ? Array.isArray(a.shortcut)
              ? a.shortcut.join(" · ")
              : a.shortcut
            : null;
          const enabled = a.enabled ? a.enabled() : true;
          return (
            <li
              key={a.id}
              className="flex items-center gap-2 px-2 py-1.5"
              aria-disabled={!enabled || undefined}
            >
              <span className="text-muted-foreground shrink-0">{a.icon}</span>
              <span className={enabled ? "" : "opacity-50"}>
                <span className="font-medium">{a.label}</span>
                {a.group && (
                  <span className="text-muted-foreground ml-2">· {a.group}</span>
                )}
              </span>
              <code className="text-muted-foreground ml-auto font-mono">
                {a.id}
              </code>
              {sc && (
                <kbd className="border-border bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px]">
                  {sc}
                </kbd>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventLog({ log }: { log: string[] }) {
  return (
    <section className="border-border bg-card flex flex-col gap-2 rounded-md border p-3">
      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        Event log
      </h2>
      {log.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Fire any action — its surface and id show up here.
        </p>
      ) : (
        <ul className="bg-background border-border max-h-48 overflow-auto rounded-md border p-2 font-mono text-[11px]">
          {log.map((line, i) => (
            <li
              key={`${i}-${line}`}
              className={i === 0 ? "text-foreground" : "text-muted-foreground"}
            >
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------- async --------------------------------- */

function useDocsSource(
  append: (line: string) => void,
): CommandSource {
  return React.useMemo(
    () => ({
      id: "docs",
      heading: "Search docs",
      search: (query, signal) =>
        new Promise<Action[]>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            const titles = [
              `Onboarding — "${query}"`,
              `API reference — "${query}"`,
              `FAQ — "${query}"`,
            ];
            resolve(
              titles.map<Action>((title, i) => ({
                id: `docs:${query}:${i}`,
                label: `Docs: ${title}`,
                run: (ctx) =>
                  append(
                    `docs hit "${title}" fired (source=${ctx.source ?? "unknown"})`,
                  ),
              })),
            );
          }, 400);
          signal.addEventListener("abort", () => {
            window.clearTimeout(timer);
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    }),
    [append],
  );
}
