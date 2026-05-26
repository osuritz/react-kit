import { SparklineArea } from '#components/sparkline/sparkline-area/sparkline-area.tsx';

// Weekly active users over the last 12 weeks.
const wau = [820, 910, 880, 1010, 960, 1180, 1240, 1190, 1330, 1410, 1380, 1520];

export function SparklineAreaDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      {/* Volume-style metric — the fill emphasises magnitude, not just slope. */}
      <div className="border-border bg-card flex max-w-sm flex-col gap-2 rounded-lg border p-4">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Weekly active users · 12 wk
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">1,520</span>
          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ▲ 10.1%
          </span>
        </div>
        <div className="text-sky-600 dark:text-sky-400">
          <SparklineArea
            values={wau}
            width={320}
            height={56}
            showLast
            label="Weekly active users, last 12 weeks, up 10.1%"
            className="w-full"
          />
        </div>
      </div>

      {/* Compact area cells side by side. */}
      <div className="flex flex-wrap gap-4">
        {[
          {
            label: 'Storage',
            series: [20, 24, 30, 41, 55, 72],
            tint: 'text-violet-600 dark:text-violet-400',
          },
          {
            label: 'Egress',
            series: [60, 58, 51, 44, 39, 33],
            tint: 'text-amber-600 dark:text-amber-400',
          },
        ].map((m) => (
          <div key={m.label} className={`flex flex-col gap-1 ${m.tint}`}>
            <span className="text-muted-foreground text-xs">{m.label}</span>
            <SparklineArea values={m.series} width={120} height={32} label={`${m.label} trend`} />
          </div>
        ))}
      </div>
    </div>
  );
}
