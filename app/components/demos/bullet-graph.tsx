import { BulletGraph } from "#components/sparkline/bullet-graph/bullet-graph.tsx";

const kpis = [
  { name: "Bookings", value: 7.2, target: 8, ranges: [5, 7], max: 10, fmt: "$7.2M", hit: false },
  { name: "NRR", value: 118, target: 110, ranges: [90, 100], max: 130, fmt: "118%", hit: true },
  { name: "CSAT", value: 4.4, target: 4.5, ranges: [3, 4], max: 5, fmt: "4.4", hit: false },
  { name: "Uptime", value: 99.96, target: 99.9, ranges: [99, 99.9], max: 100, fmt: "99.96%", hit: true },
];

export function BulletGraphDemo() {
  return (
    <div className="w-full max-w-xl">
      <table className="w-full text-sm">
        <tbody className="[&_td]:border-border [&_td]:border-b [&_td]:py-2.5 [&_td]:align-middle">
          {kpis.map((k) => (
            <tr key={k.name}>
              <td className="text-foreground w-24 font-medium">{k.name}</td>
              <td className="text-foreground">
                <BulletGraph
                  value={k.value}
                  target={k.target}
                  ranges={k.ranges}
                  max={k.max}
                  width={200}
                  height={20}
                  label={`${k.name}: ${k.fmt} vs target`}
                />
              </td>
              <td className="text-foreground w-20 text-right font-mono tabular-nums">
                {k.fmt}
              </td>
              <td className="w-16 text-right">
                <span
                  className={
                    "rounded px-1.5 py-0.5 text-[11px] font-semibold " +
                    (k.hit
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400")
                  }
                >
                  {k.hit ? "on track" : "behind"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
