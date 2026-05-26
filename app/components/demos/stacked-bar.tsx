import { StackedBar } from '#components/sparkline/stacked-bar/stacked-bar.tsx';

const ci = [
  { value: 412, label: 'passed', color: '#10b981', swatch: 'bg-emerald-500' },
  { value: 18, label: 'failed', color: 'var(--destructive)', swatch: 'bg-destructive' },
  { value: 7, label: 'skipped', color: '#9ca3af', swatch: 'bg-zinc-400' },
];

export function StackedBarDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {/* Status breakdown — explicit semantic colors + a legend. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Test run · 437 total</span>
          <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            94.3% pass
          </span>
        </div>
        <StackedBar
          segments={ci.map((s) => ({ value: s.value, label: s.label, color: s.color }))}
          width={420}
          height={10}
          label="412 passed, 18 failed, 7 skipped"
          className="w-full"
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {ci.map((s) => (
            <span key={s.label} className="text-muted-foreground flex items-center gap-1.5">
              <span className={`size-2 rounded-sm ${s.swatch}`} />
              {s.label} · {s.value}
            </span>
          ))}
        </div>
      </div>

      {/* Neutral composition — default cycled chart tokens. */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          Cloud spend by service (default chart tokens)
        </span>
        <StackedBar
          segments={[{ value: 5 }, { value: 3 }, { value: 2 }, { value: 1 }]}
          width={420}
          height={10}
          label="Cloud spend split across four services"
          className="w-full"
        />
      </div>
    </div>
  );
}
