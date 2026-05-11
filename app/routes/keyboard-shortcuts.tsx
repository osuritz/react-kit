import { DropInPage } from "~/components/drop-in-page";
import { KeyboardShortcutsDemo } from "~/components/demos/keyboard-shortcuts";
import keyboardShortcutsSrc from "~/components/demos/keyboard-shortcuts.tsx?raw";

export default function KeyboardShortcutsRoute() {
  return (
    <DropInPage
      title="KeyboardShortcuts"
      description="A drop-in keybinding layer + cheatsheet that consume the action-registry. Bind any registered action by setting its `shortcut` field — single chords, alternates, or g-i-style sequences. The cheatsheet picks them up automatically."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/components/keyboard-shortcuts"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/components/keyboard-shortcuts/README.md"
      demos={[
        {
          title: "Shortcut bindings + cheatsheet",
          description:
            "Try ⌘K, ⌘S, the g-i sequence, or / from anywhere on the page. Press ? to open the cheatsheet.",
          source: keyboardShortcutsSrc,
          render: <KeyboardShortcutsDemo />,
        },
      ]}
    />
  );
}
