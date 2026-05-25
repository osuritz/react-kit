import { SparklineThreshold } from "#components/sparkline/sparkline-threshold/sparkline-threshold.tsx";

// p95 latency (ms) over 16 intervals; SLO is 200ms, healthy band 0–150ms.
const latency = [
  118, 132, 121, 145, 160, 138, 152, 188, 240, 205, 170, 142, 128, 196, 210, 150,
];

export function SparklineThresholdDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="border-border bg-card flex max-w-md flex-col gap-2 rounded-lg border p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            p95 latency · 16 intervals
          </div>
          <div className="text-muted-foreground font-mono text-xs">
            SLO 200ms · band 0–150
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">150 ms</span>
          <span className="text-xs font-semibold tabular-nums text-destructive">
            3 breaches
          </span>
        </div>
        <div className="text-sky-600 dark:text-sky-400">
          <SparklineThreshold
            values={latency}
            threshold={200}
            band={[0, 150]}
            showLast
            width={420}
            height={64}
            label="p95 latency vs 200ms SLO; 3 intervals breached"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
