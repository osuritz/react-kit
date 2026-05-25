import { DropInPage } from "~/components/drop-in-page";
import { SparklineWinLossDemo } from "~/components/demos/sparkline-winloss";
import sparklineWinLossSrc from "~/components/demos/sparkline-winloss.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/components/sparkline/sparkline-winloss";

export default function SparklineWinLossRoute() {
  return (
    <DropInPage
      title="SparklineWinLoss"
      description="Equal-height up/down ticks for binary outcomes — SLA met/missed, test pass/fail, gain/loss days. Magnitude is ignored; the pattern is the point. Losses turn destructive."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Outcomes at a glance",
          description:
            "A 20-day SLA met/missed strip and a CI pass/fail strip — wins take the container color, losses are tinted with the destructive token.",
          source: sparklineWinLossSrc,
          render: <SparklineWinLossDemo />,
        },
      ]}
    />
  );
}
