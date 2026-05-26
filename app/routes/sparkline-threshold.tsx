import { DropInPage } from '~/components/drop-in-page';
import { SparklineThresholdDemo } from '~/components/demos/sparkline-threshold';
import sparklineThresholdSrc from '~/components/demos/sparkline-threshold.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/components/sparkline/sparkline-threshold';

export default function SparklineThresholdRoute() {
  return (
    <DropInPage
      title="SparklineThreshold"
      description="A monitoring sparkline: a trend line with a shaded acceptable band and a dashed limit line. Points that breach the limit or leave the band are marked destructive."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Metric vs SLO',
          description:
            'p95 latency against a 200ms limit with a 0–150ms healthy band — the three intervals over the limit are flagged with the destructive token.',
          source: sparklineThresholdSrc,
          render: <SparklineThresholdDemo />,
        },
      ]}
    />
  );
}
