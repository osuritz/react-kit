import { DropInPage } from "~/components/drop-in-page";
import { CommandPaletteDemo } from "~/components/demos/command-palette";
import commandPaletteSrc from "~/components/demos/command-palette.tsx?raw";

export default function CommandPaletteRoute() {
  return (
    <DropInPage
      title="CommandPalette"
      description="A drop-in cmd+k launcher built on cmdk. Reads from the action-registry, groups by Action.group, fuzzy-matches label + keywords, filters out disabled actions, shows platform-correct shortcut glyphs, persists last-5 recents, and accepts async CommandSources for backend search — debounced, with per-source loading."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/components/command-palette"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/components/command-palette/README.md"
      demos={[
        {
          title: "Palette + async source",
          description:
            "Press ⌘K (or click the button) to open. Try 'theme', 'sign', or 'onboarding' (the last hits a fake async docs source). Recents persist across reloads in localStorage.",
          source: commandPaletteSrc,
          render: <CommandPaletteDemo />,
        },
      ]}
    />
  );
}
