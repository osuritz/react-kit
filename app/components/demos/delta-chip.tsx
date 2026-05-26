import { DeltaChip } from '#components/sparkline/delta-chip/delta-chip.tsx';

const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}%`;

const metrics = [
  { name: 'Revenue', value: '$1.41M', delta: 7.2, invert: false },
  { name: 'Churn', value: '2.1%', delta: -0.4, invert: false },
  { name: 'p95 latency', value: '150 ms', delta: 18, invert: true },
  { name: 'Cloud cost', value: '$48.2k', delta: 12, invert: true },
  { name: 'NPS', value: '61', delta: 0, invert: false },
];

export function DeltaChipDemo() {
  return (
    <div className="grid w-full max-w-md grid-cols-[1fr_auto_auto] items-baseline gap-x-6 gap-y-3 text-sm">
      {metrics.map((m) => (
        <div key={m.name} className="contents">
          <span className="text-muted-foreground">{m.name}</span>
          <span className="text-foreground text-right font-mono tabular-nums">{m.value}</span>
          <span className="text-right">
            <DeltaChip
              value={m.delta}
              invert={m.invert}
              format={pct}
              label={`${m.name} change ${pct(m.delta)}${m.invert ? ' (lower is better)' : ''}`}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
