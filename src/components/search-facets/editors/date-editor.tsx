// Drop-in users must import the react-day-picker stylesheet once in their app
// entry, e.g. `import "react-day-picker/style.css";`. We import it here as a
// side-effect so the harness picks it up too; Vitest ignores CSS imports.
// Note: react-day-picker v9 exposes the stylesheet at `react-day-picker/style.css`
// (not `react-day-picker/dist/style.css` as in v8).
import "react-day-picker/style.css";

import * as React from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Select } from "@base-ui/react/select";
import { Checkbox } from "@base-ui/react/checkbox";

import type { DateFacet, EditorProps, Value } from "../grammar/types";
import { cn, editorStyles } from "../lib/cn";

type Op = "eq" | "gte" | "lte" | "range";

const DEFAULT_OPS: ReadonlyArray<Op> = ["eq", "gte", "lte", "range"];

const OP_LABELS: Record<Op, string> = {
  eq: "is",
  gte: "on or after",
  lte: "on or before",
  range: "between",
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fromISO(raw: string): Date | undefined {
  // Parse YYYY-MM-DD as a local date (avoid TZ offset shifts).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

export function DateEditor(props: EditorProps): React.ReactNode {
  const { facet, value, negated, onCommit, onCancel } = props;

  const dateFacet = facet as DateFacet;
  const ops: ReadonlyArray<Op> =
    dateFacet.ops && dateFacet.ops.length > 0 ? dateFacet.ops : DEFAULT_OPS;

  const soleOpIsEq = ops.length === 1 && ops[0] === "eq";

  const initial = React.useMemo(() => {
    if (!value) {
      return {
        op: ops[0] as Op,
        single: undefined as Date | undefined,
        range: undefined as DateRange | undefined,
      };
    }
    if (value.kind === "literal") {
      return {
        op: "eq" as Op,
        single: fromISO(value.raw),
        range: undefined as DateRange | undefined,
      };
    }
    if (value.kind === "compare") {
      return {
        op: value.op as Op,
        single: fromISO(value.raw),
        range: undefined as DateRange | undefined,
      };
    }
    return {
      op: "range" as Op,
      single: undefined as Date | undefined,
      range: {
        from: fromISO(value.from),
        to: fromISO(value.to),
      } as DateRange,
    };
    // Initial state derives from props on mount only; user input drives subsequent updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [op, setOp] = React.useState<Op>(initial.op);
  const [single, setSingle] = React.useState<Date | undefined>(initial.single);
  const [range, setRange] = React.useState<DateRange | undefined>(initial.range);
  const [localNegated, setLocalNegated] = React.useState<boolean>(negated);

  const showNegate = facet.negatable !== false;

  const canApply =
    op === "range"
      ? Boolean(range && range.from && range.to)
      : Boolean(single);

  const handleApply = () => {
    let next: Value;
    if (op === "range") {
      if (!range || !range.from || !range.to) return;
      next = { kind: "range", from: toISO(range.from), to: toISO(range.to) };
    } else if (op === "eq") {
      if (!single) return;
      const iso = toISO(single);
      next = soleOpIsEq
        ? { kind: "literal", raw: iso }
        : { kind: "compare", op: "eq", raw: iso };
    } else {
      if (!single) return;
      next = { kind: "compare", op, raw: toISO(single) };
    }
    onCommit({ value: next, negated: localNegated });
  };

  return (
    <div data-facet-type="date" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!soleOpIsEq ? (
          <Select.Root
            value={op}
            onValueChange={(nextValue) => {
              if (nextValue == null) return;
              setOp(nextValue as Op);
            }}
          >
            <Select.Trigger
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm shadow-xs transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                "dark:bg-input/30",
              )}
            >
              <Select.Value>{(v) => OP_LABELS[(v as Op) ?? op]}</Select.Value>
              <Select.Icon className="text-muted-foreground">
                <svg
                  viewBox="0 0 16 16"
                  className="size-3"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner sideOffset={4}>
                <Select.Popup
                  className={cn(
                    "z-50 min-w-32 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden",
                  )}
                >
                  {ops.map((candidate) => (
                    <Select.Item
                      key={candidate}
                      value={candidate}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                      )}
                    >
                      <Select.ItemIndicator className="size-3 text-current">
                        <svg
                          viewBox="0 0 16 16"
                          className="size-3"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8l3 3 7-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Select.ItemIndicator>
                      <Select.ItemText>
                        {OP_LABELS[candidate]}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        ) : null}

        {showNegate ? (
          <label className={editorStyles.checkboxLabel}>
            <Checkbox.Root
              checked={localNegated}
              onCheckedChange={(checked) => setLocalNegated(Boolean(checked))}
              className={editorStyles.checkbox}
            >
              <Checkbox.Indicator className="text-current">
                <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
                  <path
                    d="M3 8l3 3 7-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Checkbox.Indicator>
            </Checkbox.Root>
            Negate
          </label>
        ) : null}
      </div>

      <div className="rounded-md border bg-background p-1 text-sm dark:bg-input/30">
        {op === "range" ? (
          <DayPicker
            mode="range"
            selected={range}
            onSelect={(next) => setRange(next)}
          />
        ) : (
          <DayPicker
            mode="single"
            selected={single}
            onSelect={(next) => setSingle(next)}
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={editorStyles.ghostButton}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          className={editorStyles.primaryButton}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
