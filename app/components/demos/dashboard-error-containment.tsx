// Error containment for a dense dashboard: one boundary *per widget* so a
// single bad data feed degrades one tile instead of blanking the whole screen.
//
// The interesting decision here is placement, not the boundary class. A
// boundary at the page root would turn any one chart's render error into a
// full white screen; a boundary around each widget keeps its neighbors alive
// and tells the user exactly what's missing. Flip the toggle to crash the
// Signups widget and watch the other three keep rendering.
//
// The `ErrorBoundary` below is the canonical ~30 zero-dep lines (an error
// boundary *must* be a class — hooks can't express `componentDidCatch`). If
// you want reset-on-prop-change variants, `useErrorBoundary`, retry helpers,
// etc., reach for `react-error-boundary` instead of growing this.
import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { SparklineArea } from "#components/sparkline/sparkline-area/sparkline-area.tsx";
import { SparklineBar } from "#components/sparkline/sparkline-bar/sparkline-bar.tsx";
import { SparklineWinLoss } from "#components/sparkline/sparkline-winloss/sparkline-winloss.tsx";
import { GaugeRing } from "#components/sparkline/gauge-ring/gauge-ring.tsx";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered in place of `children` after a render error. */
  fallback: (args: { error: Error; reset: () => void }) => ReactNode;
  /**
   * When any value here changes between renders, the boundary clears its error
   * and retries — e.g. new data arrived, or the user navigated. Same idea as
   * react-error-boundary's `resetKeys`.
   */
  resetKeys?: ReadonlyArray<unknown>;
  /** The seam for error reporting — wire Sentry/Datadog/etc. here. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    // Auto-recover once a tracked dependency changes after an error.
    if (this.state.error && !sameKeys(prev.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) return this.props.fallback({ error, reset: this.reset });
    return this.props.children;
  }
}

function sameKeys(
  a: ReadonlyArray<unknown> = [],
  b: ReadonlyArray<unknown> = [],
): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

/** A widget that throws during render — stands in for a feed returning junk. */
function Boom(): never {
  throw new Error("Signups feed returned malformed data");
}

function WidgetShell({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border bg-card flex h-full flex-col gap-2 rounded-lg border p-3">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {children}
    </div>
  );
}

/** The graceful degradation tile: same footprint, keeps the label, offers retry. */
export function WidgetFallback({
  label,
  error,
  onRetry,
}: {
  label: string;
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="border-destructive/30 bg-destructive/5 flex h-full flex-col gap-2 rounded-lg border p-3">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="text-destructive flex items-start gap-1.5">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        <p className="text-xs leading-tight">Couldn&rsquo;t render this widget.</p>
      </div>
      <p className="text-muted-foreground truncate font-mono text-[10px]" title={error.message}>
        {error.message}
      </p>
      <Button size="xs" variant="outline" onClick={onRetry} className="mt-auto self-start">
        <RotateCw />
        Retry
      </Button>
    </div>
  );
}

/** Wraps one widget in its own boundary. This is the placement decision. */
function Widget({
  label,
  value,
  resetKey,
  children,
}: {
  label: string;
  value: string;
  resetKey: unknown;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      resetKeys={[resetKey]}
      fallback={({ error, reset }) => (
        <WidgetFallback label={label} error={error} onRetry={reset} />
      )}
    >
      <WidgetShell label={label} value={value}>
        {children}
      </WidgetShell>
    </ErrorBoundary>
  );
}

export function DashboardErrorContainmentDemo() {
  const [broken, setBroken] = useState(false);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant={broken ? "destructive" : "outline"}
          onClick={() => setBroken((v) => !v)}
        >
          {broken ? "Clear injected error" : "Inject a render error"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Crashes the <strong className="text-foreground">Signups</strong> widget
          mid-render. Its three neighbors keep working — the failure is contained
          to one boundary, and clearing it auto-recovers via <code>resetKeys</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Widget label="Revenue · 12wk" value="$1.41M" resetKey={broken}>
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
        </Widget>

        <Widget label="Signups · 14d" value="31/day" resetKey={broken}>
          {broken ? (
            <Boom />
          ) : (
            <div className="text-violet-600 dark:text-violet-400">
              <SparklineBar
                values={[12, 18, 9, 22, 16, 25, 30, 21, 28, 33, 19, 27, 35, 31]}
                width={160}
                height={36}
                label="Daily signups"
                className="w-full"
              />
            </div>
          )}
        </Widget>

        <Widget label="SLA · 20d" value="17/20" resetKey={broken}>
          <div className="text-emerald-600 dark:text-emerald-400">
            <SparklineWinLoss
              values={[1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, 0, 1, 1, -1, 1, 1, 1, 1, 1]}
              width={160}
              height={28}
              label="SLA met or missed"
              className="w-full"
            />
          </div>
        </Widget>

        <Widget label="p95 latency" value="150 ms" resetKey={broken}>
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <GaugeRing value={75} size={40} thickness={6} centerLabel="75" label="latency budget used 75%" />
            <span className="text-muted-foreground text-xs leading-tight">
              75% of
              <br />
              SLO budget
            </span>
          </div>
        </Widget>
      </div>

      <div className="border-border bg-muted/30 text-muted-foreground flex flex-col gap-2 rounded-md border px-4 py-3 text-xs leading-relaxed">
        <p>
          <strong className="text-foreground">Placement is the real decision.</strong>{" "}
          One boundary per widget means a single bad feed degrades one tile, not
          the whole dashboard. A boundary at the page root would blank everything;
          too many tiny boundaries add noise. Group by what can fail independently.
        </p>
        <p>
          <strong className="text-foreground">Boundaries only catch render errors.</strong>{" "}
          Errors thrown in event handlers, async code (timeouts, promises,
          <code> fetch</code>), and during SSR are <em>not</em> caught — handle
          those with <code>try/catch</code> where they happen, then surface them
          through your own error state.
        </p>
      </div>
    </div>
  );
}
