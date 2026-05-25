import { SparklineBar } from "#components/sparkline/sparkline-bar/sparkline-bar.tsx";

// Daily signups over the last 14 days.
const signups = [12, 18, 9, 22, 16, 25, 30, 21, 28, 33, 19, 27, 35, 31];
// Net cash flow by month — swings negative.
const netFlow = [8, 5, -3, 6, -7, 4, 9, -2, 11, 7];

export function SparklineBarDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="border-border bg-card flex max-w-sm flex-col gap-2 rounded-lg border p-4">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Signups · 14 d
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">31</span>
          <span className="text-muted-foreground text-xs">today</span>
        </div>
        <div className="text-chart-2">
          <SparklineBar
            values={signups}
            width={320}
            height={44}
            label="Daily signups, last 14 days"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          Net cash flow · 10 mo — below-baseline bars turn destructive
        </span>
        <SparklineBar
          values={netFlow}
          baseline={0}
          width={220}
          height={48}
          label="Monthly net cash flow, last 10 months"
        />
      </div>
    </div>
  );
}
