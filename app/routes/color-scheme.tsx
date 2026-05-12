import { DropInPage } from "~/components/drop-in-page";
import { ModeToggleButton } from "~/components/demos/mode-toggle-button";
import { ModeToggleSegmented } from "~/components/demos/mode-toggle-segmented";
import buttonSrc from "~/components/demos/mode-toggle-button.tsx?shiki";
import segmentedSrc from "~/components/demos/mode-toggle-segmented.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/hooks/color-scheme";

export default function ColorSchemeRoute() {
  return (
    <DropInPage
      title="useColorScheme"
      description="A drop-in React hook for resolving and applying a light/dark color scheme. Works without a provider, persists the user choice, and tracks the OS preference. Two recommended toggle patterns are shown below."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Light / dark button",
          description:
            "Two-state icon button. Setting either light or dark is explicit — clicking breaks 'system' tracking.",
          source: buttonSrc,
          render: <ModeToggleButton />,
        },
        {
          title: "Light / dark / system segmented",
          description:
            "Three-state segmented control bound to the user choice. When 'system' is selected, the resolved scheme is shown below.",
          source: segmentedSrc,
          render: <ModeToggleSegmented />,
        },
      ]}
    />
  );
}
