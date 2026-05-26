import { HeatStrip } from '#components/sparkline/heat-strip/heat-strip.tsx';

// Requests per hour across a day (00:00 → 23:00).
const hourly = [2, 1, 0, 0, 1, 3, 8, 14, 19, 22, 18, 15, 17, 20, 16, 12, 9, 11, 7, 5, 4, 3, 2, 1];

// Per-service rows — a tiny density matrix made of stacked strips.
const services = [
  { name: 'api', load: [4, 6, 9, 12, 18, 22, 16, 10, 7, 5] },
  { name: 'worker', load: [1, 2, 2, 5, 9, 14, 20, 24, 18, 9] },
  { name: 'web', load: [8, 10, 12, 11, 9, 7, 6, 5, 4, 3] },
];

export function HeatStripDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          Requests per hour · last 24h (darker = busier)
        </span>
        <div className="text-sky-600 dark:text-sky-400">
          <HeatStrip
            values={hourly}
            width={420}
            height={16}
            label="Requests per hour over the last 24 hours"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {services.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span className="text-muted-foreground w-14 font-mono text-xs">{s.name}</span>
            <div className="text-violet-600 dark:text-violet-400">
              <HeatStrip
                values={s.load}
                width={300}
                height={14}
                label={`${s.name} load by interval`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
