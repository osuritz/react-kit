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

import type {
  DateFacet,
  EditorProps,
  Value,
} from "../grammar/types.js";

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

  // Narrow facet to DateFacet at runtime via the type tag from the schema.
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
    // value.kind === "range"
    return {
      op: "range" as Op,
      single: undefined as Date | undefined,
      range: {
        from: fromISO(value.from),
        to: fromISO(value.to),
      } as DateRange,
    };
    // Initial state derives from props on mount only; subsequent updates are driven by user input.
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
      // gte | lte
      if (!single) return;
      next = { kind: "compare", op, raw: toISO(single) };
    }
    onCommit({ value: next, negated: localNegated });
  };

  return (
    <div className="search-facets-date-editor">
      <div className="search-facets-date-editor__row">
        <Select.Root
          value={op}
          onValueChange={(nextValue) => {
            if (nextValue == null) return;
            setOp(nextValue as Op);
          }}
        >
          <Select.Trigger className="search-facets-date-editor__op-trigger">
            <Select.Value>{(v) => OP_LABELS[(v as Op) ?? op]}</Select.Value>
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup className="search-facets-date-editor__op-popup">
                {ops.map((candidate) => (
                  <Select.Item key={candidate} value={candidate}>
                    <Select.ItemIndicator />
                    <Select.ItemText>{OP_LABELS[candidate]}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="search-facets-date-editor__picker">
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

      {showNegate ? (
        <label className="search-facets-date-editor__negate">
          <Checkbox.Root
            checked={localNegated}
            onCheckedChange={(checked) => setLocalNegated(Boolean(checked))}
          >
            <Checkbox.Indicator />
          </Checkbox.Root>
          <span>Negate</span>
        </label>
      ) : null}

      <div className="search-facets-date-editor__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={handleApply} disabled={!canApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
