import { SparklineWinLoss } from '#components/sparkline/sparkline-winloss/sparkline-winloss.tsx';

// +1 = SLA met, -1 = missed, 0 = no traffic — last 20 days.
const sla = [1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, 0, 1, 1, -1, 1, 1, 1, 1, 1];
// CI: +1 build passed, -1 failed.
const ci = [1, 1, -1, 1, 1, 1, -1, -1, 1, 1, 1, 1];

export function SparklineWinLossDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">SLA met / missed · 20 d</span>
          <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            17 / 20
          </span>
        </div>
        <div className="text-emerald-600 dark:text-emerald-400">
          <SparklineWinLoss
            values={sla}
            width={280}
            height={28}
            label="SLA met or missed, last 20 days: 17 met, 3 missed"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">CI builds · last 12</span>
        <div className="text-sky-600 dark:text-sky-400">
          <SparklineWinLoss
            values={ci}
            width={200}
            height={32}
            label="CI build pass/fail, last 12 runs"
          />
        </div>
      </div>
    </div>
  );
}
