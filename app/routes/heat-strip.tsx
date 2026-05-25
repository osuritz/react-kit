import { DropInPage } from "~/components/drop-in-page";
import { HeatStripDemo } from "~/components/demos/heat-strip";
import heatStripSrc from "~/components/demos/heat-strip.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/components/sparkline/heat-strip";

export default function HeatStripRoute() {
  return (
    <DropInPage
      title="HeatStrip"
      description="A single row of cells whose opacity encodes intensity — request volume by hour, activity by day, error density. One color ramped by opacity, no multi-hue scale."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Density over time",
          description:
            "An hourly request-volume strip, and a small per-service matrix built by stacking strips — darker cells are busier intervals.",
          source: heatStripSrc,
          render: <HeatStripDemo />,
        },
      ]}
    />
  );
}
