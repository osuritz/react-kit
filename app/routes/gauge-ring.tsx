import { DropInPage } from '~/components/drop-in-page';
import { GaugeRingDemo } from '~/components/demos/gauge-ring';
import gaugeRingSrc from '~/components/demos/gauge-ring.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/components/sparkline/gauge-ring';

export default function GaugeRingRoute() {
  return (
    <DropInPage
      title="GaugeRing"
      description="A single percentage as a donut — quota usage, completion, health score. The arc uses pathLength=100 so its length is just the percentage, with an optional center label."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Usage rings',
          description:
            'Four quota/completion rings, each colored via a text-* class on its wrapper, with a percentage in the middle.',
          source: gaugeRingSrc,
          render: <GaugeRingDemo />,
        },
      ]}
    />
  );
}
