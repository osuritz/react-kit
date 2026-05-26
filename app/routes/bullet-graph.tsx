import { DropInPage } from '~/components/drop-in-page';
import { BulletGraphDemo } from '~/components/demos/bullet-graph';
import bulletGraphSrc from '~/components/demos/bullet-graph.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/components/sparkline/bullet-graph';

export default function BulletGraphRoute() {
  return (
    <DropInPage
      title="BulletGraph"
      description="Tufte's compact actual-vs-target bar with qualitative bands (poor/ok/good). The richest KPI micro-chart — did we hit the number, and is that good?"
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Scorecard rows',
          description:
            'A four-KPI scorecard: each row pairs a bullet graph (measure bar + target tick over poor/ok/good bands) with its formatted value and an on-track / behind chip.',
          source: bulletGraphSrc,
          render: <BulletGraphDemo />,
        },
      ]}
    />
  );
}
