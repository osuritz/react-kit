import { GaugeRing } from "#components/sparkline/gauge-ring/gauge-ring.tsx";

const rings = [
  { label: "Storage", value: 72, suffix: "%", tint: "text-sky-600 dark:text-sky-400" },
  { label: "Seats used", value: 88, suffix: "%", tint: "text-violet-600 dark:text-violet-400" },
  { label: "Budget", value: 96, suffix: "%", tint: "text-amber-600 dark:text-amber-400" },
  { label: "Onboarding", value: 40, suffix: "%", tint: "text-emerald-600 dark:text-emerald-400" },
];

export function GaugeRingDemo() {
  return (
    <div className="flex w-full flex-wrap items-start gap-6">
      {rings.map((r) => (
        <div key={r.label} className="flex flex-col items-center gap-2">
          <div className={r.tint}>
            <GaugeRing
              value={r.value}
              size={64}
              thickness={8}
              centerLabel={`${r.value}${r.suffix}`}
              label={`${r.label}: ${r.value}${r.suffix}`}
            />
          </div>
          <span className="text-muted-foreground text-xs">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
