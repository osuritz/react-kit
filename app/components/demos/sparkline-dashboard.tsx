// A composed enterprise dashboard showing the whole micro-chart family working
// together in realistic surfaces: KPI stat cards, a goals scorecard, a
// composition bar, and a traffic heat strip. Each chart is consumed exactly as
// an app would consume the drop-in (via `#components/sparkline/...`).
import { SparklineArea } from "#components/sparkline/sparkline-area/sparkline-area.tsx";
import { SparklineBar } from "#components/sparkline/sparkline-bar/sparkline-bar.tsx";
import { SparklineWinLoss } from "#components/sparkline/sparkline-winloss/sparkline-winloss.tsx";
import { GaugeRing } from "#components/sparkline/gauge-ring/gauge-ring.tsx";
import { BulletGraph } from "#components/sparkline/bullet-graph/bullet-graph.tsx";
import { StackedBar } from "#components/sparkline/stacked-bar/stacked-bar.tsx";
import { HeatStrip } from "#components/sparkline/heat-strip/heat-strip.tsx";
import { DeltaChip } from "#components/sparkline/delta-chip/delta-chip.tsx";
// Defined once in the error-containment demo and reused here: a real dashboard
// wraps each widget in its own boundary so one bad feed degrades a single tile
// instead of blanking the whole surface. The "Error rate" card below is wired
// to a down feed to show that containment in place.
import { ErrorBoundary, WidgetFallback } from "./dashboard-error-containment";

const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

function StatCard({
  label,
  value,
  delta,
  invert,
  children,
}: {
  label: string;
  value: string;
  delta: number;
  invert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-3">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        <DeltaChip value={delta} invert={invert} format={pct} label={`${label} ${pct(delta)}`} />
      </div>
      {children}
    </div>
  );
}

/** A stat card wrapped in its own error boundary — degrades to a fallback tile. */
function GuardedStatCard(props: {
  label: string;
  value: string;
  delta: number;
  invert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <WidgetFallback label={props.label} error={error} onRetry={reset} />
      )}
    >
      <StatCard {...props} />
    </ErrorBoundary>
  );
}

/** Stand-in for a widget whose data feed is down — throws during render. */
function FailingTrend(): never {
  throw new Error("Monitoring feed unavailable (503)");
}

export function SparklineDashboardDemo() {
  return (
    <div className="flex w-full flex-col gap-5">
      {/* What's a sparkline? — a short intro for first-time readers. */}
      <p className="text-muted-foreground border-border bg-muted/30 rounded-md border px-4 py-3 text-sm leading-relaxed">
        A <strong className="text-foreground">sparkline</strong> is a tiny,
        word-sized chart that conveys a trend or distribution at a glance — no
        axes, gridlines, or labels — like GitHub&rsquo;s contribution graph or the
        mini chart beside a stock price. They sit inline with text and numbers in
        dense, data-heavy UIs. Below, the whole family works together at realistic
        sizes.
      </p>

      {/* KPI stat cards — each guarded by its own boundary, so the "Error rate"
          card (its feed is down) degrades alone while the rest keep rendering. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <GuardedStatCard label="Revenue · 12wk" value="$1.41M" delta={7.2}>
          <div className="text-sky-600 dark:text-sky-400">
            <SparklineArea
              values={[82, 88, 91, 87, 95, 102, 99, 110, 121, 118, 132, 141]}
              width={160}
              height={36}
              showLast
              label="Revenue trend, up 7.2%"
              className="w-full"
            />
          </div>
        </GuardedStatCard>

        <GuardedStatCard label="Signups · 14d" value="31/day" delta={9}>
          <div className="text-violet-600 dark:text-violet-400">
            <SparklineBar
              values={[12, 18, 9, 22, 16, 25, 30, 21, 28, 33, 19, 27, 35, 31]}
              width={160}
              height={36}
              label="Daily signups"
              className="w-full"
            />
          </div>
        </GuardedStatCard>

        <GuardedStatCard label="SLA · 20d" value="17/20" delta={-2}>
          <div className="text-emerald-600 dark:text-emerald-400">
            <SparklineWinLoss
              values={[1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, 0, 1, 1, -1, 1, 1, 1, 1, 1]}
              width={160}
              height={28}
              label="SLA met or missed"
              className="w-full"
            />
          </div>
        </GuardedStatCard>

        <GuardedStatCard label="p95 latency" value="150 ms" delta={18} invert>
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <GaugeRing value={75} size={40} thickness={6} centerLabel="75" label="latency budget used 75%" />
            <span className="text-muted-foreground text-xs leading-tight">
              75% of
              <br />
              SLO budget
            </span>
          </div>
        </GuardedStatCard>

        {/* This widget's feed is down — it throws on render and its boundary
            catches it, leaving the four healthy cards untouched. */}
        <GuardedStatCard label="Error rate · 24h" value="0.4%" delta={0} invert>
          <FailingTrend />
        </GuardedStatCard>
      </div>

      {/* Goals scorecard + composition */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
          <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Quarterly goals
          </div>
          {[
            { name: "Bookings", value: 7.2, target: 8, ranges: [5, 7], max: 10, fmt: "$7.2M" },
            { name: "NRR", value: 118, target: 110, ranges: [90, 100], max: 130, fmt: "118%" },
            { name: "CSAT", value: 4.4, target: 4.5, ranges: [3, 4], max: 5, fmt: "4.4" },
          ].map((g) => (
            <div key={g.name} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-2 text-sm">
              <span className="text-muted-foreground">{g.name}</span>
              <div className="text-foreground">
                <BulletGraph
                  value={g.value}
                  target={g.target}
                  ranges={g.ranges}
                  max={g.max}
                  width={220}
                  height={18}
                  label={`${g.name} ${g.fmt} vs target`}
                  className="w-full"
                />
              </div>
              <span className="text-foreground text-right font-mono text-xs tabular-nums">
                {g.fmt}
              </span>
            </div>
          ))}
        </div>

        <div className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Pipeline by stage
            </div>
            <StackedBar
              segments={[
                { value: 42, color: "#10b981" },
                { value: 31, color: "#0ea5e9" },
                { value: 18, color: "#a855f7" },
                { value: 9, color: "var(--muted-foreground)" },
              ]}
              width={320}
              height={10}
              label="Pipeline: 42 qualified, 31 proposal, 18 negotiation, 9 closing"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Requests · last 24h
            </div>
            <div className="text-sky-600 dark:text-sky-400">
              <HeatStrip
                values={[2, 1, 0, 0, 1, 3, 8, 14, 19, 22, 18, 15, 17, 20, 16, 12, 9, 11, 7, 5, 4, 3, 2, 1]}
                width={320}
                height={14}
                label="Requests per hour, last 24h"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
