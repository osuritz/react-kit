import { DropInPage } from "~/components/drop-in-page";
import { SparklineLineDemo } from "~/components/demos/sparkline-line";
import sparklineLineSrc from "~/components/demos/sparkline-line.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/components/sparkline/sparkline-line";

export default function SparklineLineRoute() {
  return (
    <DropInPage
      title="SparklineLine"
      description="A small, axis-less trend line for tables, KPI cards, and dense dashboards. Pure SVG, colored via currentColor, with optional last-point and min/max markers."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Trend in context",
          description:
            "A KPI card with a last-point dot, and the same sparkline shrunk into table rows with min/max markers — each inherits its color from the surrounding text via currentColor.",
          source: sparklineLineSrc,
          render: <SparklineLineDemo />,
        },
      ]}
    />
  );
}
