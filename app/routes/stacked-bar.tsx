import { DropInPage } from "~/components/drop-in-page";
import { StackedBarDemo } from "~/components/demos/stacked-bar";
import stackedBarSrc from "~/components/demos/stacked-bar.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/components/sparkline/stacked-bar";

export default function StackedBarRoute() {
  return (
    <DropInPage
      title="StackedBar"
      description="A single-row part-to-whole bar for composition: status breakdowns, budget splits, market share. Segments cycle the chart tokens or take an explicit color."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Composition at a glance",
          description:
            "A CI test-run breakdown with semantic per-status colors and a legend, plus a neutral spend split that falls back to the cycled chart tokens.",
          source: stackedBarSrc,
          render: <StackedBarDemo />,
        },
      ]}
    />
  );
}
