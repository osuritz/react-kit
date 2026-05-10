import * as React from "react";
import { Button } from "#components/ui/button.tsx";
import {
  ActionsProvider,
  useAction,
  useActions,
} from "#hooks/action-registry/actions.tsx";
import {
  ShortcutCheatsheet,
  ShortcutsProvider,
  formatShortcut,
} from "#components/keyboard-shortcuts/keyboard-shortcuts.tsx";

/**
 * Demo for the keyboard-shortcuts drop-in. Registers four sample actions
 * with shortcuts (a single chord, an alternates array, and a `g i` two-key
 * sequence), shows a small "what happened" log, and exposes a button that
 * opens the cheatsheet without going through the keyboard.
 *
 * The whole thing is wrapped in its own `ActionsProvider` so it doesn't
 * compete with other drop-ins on the demo page; in a real app one provider
 * at the root is the norm.
 */
export function KeyboardShortcutsDemo() {
  return (
    <ActionsProvider>
      <ShortcutsProvider>
        <DemoBody />
      </ShortcutsProvider>
    </ActionsProvider>
  );
}

function DemoBody() {
  const [log, setLog] = React.useState<string[]>([]);
  const [cheatsheetOpen, setCheatsheetOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const append = React.useCallback((line: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${line}`, ...prev].slice(0, 6));
  }, []);

  // Action 1: single chord, fires even from inputs.
  useAction({
    id: "demo.palette",
    label: "Open command palette",
    group: "Navigation",
    shortcut: "mod+k",
    allowInInput: true,
    run: () => append("mod+k → palette open"),
  });

  // Action 2: array-of-alternates, cross-platform-friendly.
  useAction({
    id: "demo.save",
    label: "Save",
    group: "File",
    shortcut: ["mod+s", "ctrl+s"],
    run: () => append("save fired"),
  });

  // Action 3: a `g i` two-chord sequence, gated by a guard.
  useAction({
    id: "demo.goto-inbox",
    label: "Go to inbox",
    group: "Navigation",
    shortcut: "g i",
    enabled: () => true,
    run: () => append("g i → inbox"),
  });

  // Action 4: a single-character shortcut (`?` works because the matcher
  // relaxes shift comparison for shift-produced punctuation).
  useAction({
    id: "demo.help",
    label: "Show help",
    group: "Help",
    shortcut: "/",
    run: () => append("/ → help"),
  });

  const { getAll } = useActions();
  const allActions = getAll();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setCheatsheetOpen(true)}>
          Open cheatsheet (?)
        </Button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Try ⌘K — works inside this input (allowInInput)"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 flex-1 rounded-md border px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="border-border bg-muted/30 flex flex-col gap-2 rounded-md border px-3 py-2.5">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Registered shortcuts
          </h4>
          <ul className="flex flex-col gap-1">
            {allActions
              .filter((a) => a.shortcut)
              .map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate">{a.label}</span>
                  <ShortcutGlyphs shortcut={a.shortcut!} />
                </li>
              ))}
          </ul>
        </section>

        <section className="border-border bg-muted/30 flex flex-col gap-2 rounded-md border px-3 py-2.5">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Activity
          </h4>
          {log.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Press a shortcut anywhere on the page.
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
      </div>

      <ShortcutCheatsheet
        open={cheatsheetOpen}
        onOpenChange={setCheatsheetOpen}
        description={
          <>
            Bound to <kbd className="font-mono">?</kbd> globally. Drop the
            component into your tree and every registered action with a{" "}
            <code>shortcut</code> field shows up here automatically.
          </>
        }
      />
    </div>
  );
}

function ShortcutGlyphs({ shortcut }: { shortcut: string | string[] }) {
  const fmt = React.useMemo(() => formatShortcut(shortcut), [shortcut]);
  return (
    <span className="flex items-center gap-1">
      {fmt.sequences.map((seq, si) => (
        <React.Fragment key={si}>
          {si > 0 ? (
            <span className="text-muted-foreground text-[10px]">or</span>
          ) : null}
          <span className="flex items-center gap-0.5">
            {seq.chords.map((chord, ci) => (
              <React.Fragment key={ci}>
                {ci > 0 ? (
                  <span className="text-muted-foreground text-[10px]">then</span>
                ) : null}
                <span className="flex items-center gap-0.5">
                  {chord.caps.map((cap) => (
                    <kbd
                      key={cap.id}
                      className="border-border bg-muted text-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium shadow-xs"
                    >
                      {cap.label}
                    </kbd>
                  ))}
                </span>
              </React.Fragment>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
