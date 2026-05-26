import { SparklineLine } from '#components/sparkline/sparkline-line/sparkline-line.tsx';

// Weekly revenue over the last 12 weeks (indexed $K), trending up.
const revenue = [82, 88, 91, 87, 95, 102, 99, 110, 121, 118, 132, 141];

const regions = [
  { region: 'AMER', series: [40, 44, 42, 50, 55, 53, 61], total: '612' },
  { region: 'EMEA', series: [30, 28, 33, 31, 29, 35, 38], total: '388' },
  { region: 'APAC', series: [12, 18, 22, 19, 27, 33, 41], total: '415' },
];

export function SparklineLineDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      {/* KPI card — last-point dot, colored via a text-* class on the wrapper. */}
      <div className="border-border bg-card flex max-w-xs flex-col gap-2 rounded-lg border p-4">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Revenue · 12 wk
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">$1.41M</span>
          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ▲ 7.2%
          </span>
        </div>
        <div className="text-sky-600 dark:text-sky-400">
          <SparklineLine
            values={revenue}
            width={240}
            height={44}
            showLast
            label="Weekly revenue, last 12 weeks, trending up 7.2%"
            className="w-full"
          />
        </div>
      </div>

      {/* Inline in a table — each cell inherits the row color via currentColor. */}
      <table className="w-full max-w-md text-sm">
        <tbody className="[&_td]:border-border [&_td]:border-b [&_td]:py-2">
          {regions.map((r) => (
            <tr key={r.region}>
              <td className="text-foreground font-medium">{r.region}</td>
              <td className="text-foreground">
                <SparklineLine
                  values={r.series}
                  width={88}
                  height={20}
                  showExtremes
                  label={`${r.region} weekly trend`}
                />
              </td>
              <td className="text-foreground text-right font-mono tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
