import { DropInPage } from '~/components/drop-in-page';
import { CommandPaletteDemo } from '~/components/demos/command-palette';
import commandPaletteSrc from '~/components/demos/command-palette.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/components/command-palette';

export default function CommandPaletteRoute() {
  return (
    <DropInPage
      title="CommandPalette"
      description="A drop-in cmd+k launcher built on cmdk. Reads from the action-registry, groups by Action.group, fuzzy-matches label + keywords, filters out disabled actions, shows platform-correct shortcut glyphs, persists last-5 recents, and accepts async CommandSources for backend search — debounced, with per-source loading."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Palette + async source',
          description:
            "Press ⌘K (or click the button) to open. Try 'theme', 'sign', or 'onboarding' (the last hits a fake async docs source). Recents persist across reloads in localStorage.",
          source: commandPaletteSrc,
          render: <CommandPaletteDemo />,
        },
      ]}
    />
  );
}
