import { DropInPage } from "~/components/drop-in-page";
import { SparklineDashboardDemo } from "~/components/demos/sparkline-dashboard";
import sparklineDashboardSrc from "~/components/demos/sparkline-dashboard.tsx?shiki";
import { repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/components/sparkline";

export default function SparklineDashboardRoute() {
  return (
    <DropInPage
      title="Sparkline dashboard"
      description="A sparkline is a tiny, word-sized chart that shows a trend or distribution at a glance, like GitHub's contribution graph. This page composes the whole micro-chart family into one enterprise surface — KPI stat cards (area, bar, win/loss, gauge, delta chips), a goals scorecard (bullet graphs), a pipeline composition bar, and a traffic heat strip."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoTreeUrl(DROP_IN_PATH)}
      demos={[
        {
          title: "KPI dashboard",
          description:
            "Each chart is consumed exactly as an app would — imported from its own drop-in folder and colored via the surrounding text color. This is the family working together at realistic sizes.",
          source: sparklineDashboardSrc,
          render: <SparklineDashboardDemo />,
        },
      ]}
    />
  );
}
