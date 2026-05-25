import { DropInPage } from "~/components/drop-in-page";
import { DeltaChipDemo } from "~/components/demos/delta-chip";
import deltaChipSrc from "~/components/demos/delta-chip.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/components/sparkline/delta-chip";

export default function DeltaChipRoute() {
  return (
    <DropInPage
      title="DeltaChip"
      description="The tiny ▲ +12% / ▼ −4% change indicator that pairs with a sparkline or metric. Positive is success-toned, negative is destructive — invert it where down is good (latency, cost)."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Deltas in a metric list",
          description:
            "A column of metrics with their period-over-period change. Note latency and cost use invert, so an increase reads as destructive rather than success.",
          source: deltaChipSrc,
          render: <DeltaChipDemo />,
        },
      ]}
    />
  );
}
