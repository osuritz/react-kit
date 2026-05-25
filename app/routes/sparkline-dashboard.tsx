import { DropInPage } from "~/components/drop-in-page";
import { SparklineDashboardDemo } from "~/components/demos/sparkline-dashboard";
import sparklineDashboardSrc from "~/components/demos/sparkline-dashboard.tsx?shiki";
import { DashboardErrorContainmentDemo } from "~/components/demos/dashboard-error-containment";
import dashboardErrorContainmentSrc from "~/components/demos/dashboard-error-containment.tsx?shiki";
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
            "Each chart is consumed exactly as an app would — imported from its own drop-in folder and colored via the surrounding text color. This is the family working together at realistic sizes. Each stat card is wrapped in its own error boundary, so the one widget with a downed feed (Error rate) degrades to a fallback tile while the rest keep rendering.",
          source: sparklineDashboardSrc,
          render: <SparklineDashboardDemo />,
        },
        {
          title: "Per-widget error containment",
          description:
            "A dense dashboard is exactly where a render error should stay local. Wrapping each widget in its own error boundary degrades a single tile to a fallback (keeping its label and a retry) while its neighbors keep rendering — instead of one bad data feed blanking the whole page. Toggle the injected error to see it contained and auto-recover.",
          source: dashboardErrorContainmentSrc,
          render: <DashboardErrorContainmentDemo />,
        },
      ]}
    />
  );
}
