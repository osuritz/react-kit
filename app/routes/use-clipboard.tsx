import { DropInPage } from "~/components/drop-in-page";
import { CopyButton } from "~/components/demos/copy-button";
import copyButtonSrc from "~/components/demos/copy-button.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/hooks/use-clipboard";

export default function UseClipboardRoute() {
  return (
    <DropInPage
      title="useClipboard"
      description="A drop-in React hook for copying text to the clipboard with a copied! affordance that auto-resets, async + execCommand fallback handling, and optional before/after callbacks. The CopyButton below is the recommended usage pattern."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Copy button",
          description:
            "A declarative <CopyButton text={value} /> with a 2s copied state and an aria-live announcement for screen readers.",
          source: copyButtonSrc,
          render: <CopyButton />,
        },
      ]}
    />
  );
}
