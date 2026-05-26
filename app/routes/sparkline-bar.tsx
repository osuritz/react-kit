import { DropInPage } from '~/components/drop-in-page';
import { SparklineBarDemo } from '~/components/demos/sparkline-bar';
import sparklineBarSrc from '~/components/demos/sparkline-bar.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/components/sparkline/sparkline-bar';

export default function SparklineBarRoute() {
  return (
    <DropInPage
      title="SparklineBar"
      description="A column sparkline for discrete per-period values (daily signups, monthly bookings). Bars below the baseline turn destructive, so negative swings read at a glance."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Counts and net flow',
          description:
            'A daily-signups column strip, and a net-cash-flow series where below-baseline bars are tinted with the destructive token.',
          source: sparklineBarSrc,
          render: <SparklineBarDemo />,
        },
      ]}
    />
  );
}
