import { useState, useSyncExternalStore } from "react";
import { Cog, HelpCircle, RotateCw, Search } from "lucide-react";
import {
  ActionsProvider,
  useAction,
  useActions,
  type Action,
} from "#hooks/action-registry/actions.tsx";

function RegisterSettings() {
  useAction({
    id: "nav.settings",
    label: "Open Settings",
    group: "Navigation",
    shortcut: "mod+,",
    keywords: ["preferences", "config"],
    icon: <Cog className="size-4" />,
    run: () => console.info("[demo] nav.settings"),
  });
  return null;
}

function RegisterHelp() {
  useAction({
    id: "nav.help",
    label: "Show keyboard shortcuts",
    group: "Help",
    shortcut: "?",
    icon: <HelpCircle className="size-4" />,
    run: () => console.info("[demo] nav.help"),
  });
  return null;
}

function RegisterRefresh() {
  useAction({
    id: "app.refresh",
    label: "Refresh data",
    group: "App",
    shortcut: ["mod+r", "f5"],
    icon: <RotateCw className="size-4" />,
    run: () => console.info("[demo] app.refresh"),
  });
  return null;
}

function RegisterSearch() {
  useAction({
    id: "nav.search",
    label: "Search…",
    group: "Navigation",
    shortcut: "mod+k",
    keywords: ["find", "command", "palette"],
    icon: <Search className="size-4" />,
    run: () => console.info("[demo] nav.search"),
  });
  return null;
}

function shortcutLabel(shortcut: Action["shortcut"]): string | null {
  if (!shortcut) return null;
  return Array.isArray(shortcut) ? shortcut.join("  ·  ") : shortcut;
}

function RegistryList() {
  const { getAll, subscribe } = useActions();
  const actions = useSyncExternalStore(subscribe, getAll, getAll);
  if (actions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">
        No actions registered.
      </p>
    );
  }
  return (
    <ul className="border-border bg-background divide-border divide-y rounded-md border">
      {actions.map((a) => {
        const sc = shortcutLabel(a.shortcut);
        return (
          <li
            key={a.id}
            className="flex items-center gap-3 px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">{a.icon}</span>
            <span className="flex-1">
              <span className="font-medium">{a.label}</span>
              {a.group && (
                <span className="text-muted-foreground ml-2 text-xs">
                  · {a.group}
                </span>
              )}
            </span>
            <code className="text-muted-foreground font-mono text-xs">
              {a.id}
            </code>
            {sc && (
              <kbd className="border-border bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[11px]">
                {sc}
              </kbd>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ActionRegistryDemo() {
  return (
    <ActionsProvider>
      <DemoBody />
    </ActionsProvider>
  );
}

function DemoBody() {
  const [showSearch, setShowSearch] = useState(true);
  return (
    <div className="flex w-full flex-col gap-3">
      <RegisterSettings />
      <RegisterHelp />
      <RegisterRefresh />
      {showSearch && <RegisterSearch />}

      <RegistryList />

      <label className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={showSearch}
          onChange={(e) => setShowSearch(e.target.checked)}
          className="border-border size-3.5 rounded border"
        />
        Mount <code className="font-mono">nav.search</code> — toggling
        proves subscribers re-render the list.
      </label>
    </div>
  );
}
