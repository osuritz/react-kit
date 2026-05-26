import { DropInPage } from '~/components/drop-in-page';
import { SparklineAreaDemo } from '~/components/demos/sparkline-area';
import sparklineAreaSrc from '~/components/demos/sparkline-area.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/components/sparkline/sparkline-area';

export default function SparklineAreaRoute() {
  return (
    <DropInPage
      title="SparklineArea"
      description="A trend line with a soft fill beneath it — for emphasising magnitude or volume (revenue, traffic, active users). Pure SVG, colored via currentColor."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Volume in context',
          description:
            'A headline metric with a filled trend, plus compact area cells — the fill draws the eye to overall magnitude rather than slope alone.',
          source: sparklineAreaSrc,
          render: <SparklineAreaDemo />,
        },
      ]}
    />
  );
}
