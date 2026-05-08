import { useEffect, useId, useRef } from "react";
import { Popover } from "@base-ui/react/popover";
import { Checkbox } from "@base-ui/react/checkbox";
import {
  type Clause,
  type EditorProps,
  type FacetDef,
  type FacetSchema,
  type Query,
  type Value,
} from "./grammar/types";
import { BooleanEditor } from "./editors/boolean-editor";
import { EnumEditor } from "./editors/enum-editor";
import { StringEditor } from "./editors/string-editor";
import { NumberEditor } from "./editors/number-editor";
import { DateEditor } from "./editors/date-editor";
import { cn } from "./lib/cn";

export interface BuilderPopoverProps {
  schema: FacetSchema;
  value: Query;
  onChange: (next: Query) => void;
  /** When non-null, the popover is in "edit" mode for the clause at this index. */
  editingIndex: number | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Element the popover is anchored to. */
  anchor: HTMLElement | null;
  /** Caller classes for the popover popup. Merged with `tailwind-merge`. */
  className?: string;
}

/**
 * Pick the right editor for a given facet definition. `def.renderEditor`
 * always wins; otherwise we dispatch on `def.type`. The `date` branch
 * statically imports `react-day-picker` via `DateEditor`; drop a date
 * facet from your schema and remove `editors/date-editor.tsx` to drop
 * the peer.
 */
function renderEditor(def: FacetDef, editorProps: EditorProps) {
  if (def.renderEditor) return def.renderEditor(editorProps);
  switch (def.type) {
    case "boolean":
      return <BooleanEditor {...editorProps} facet={def} />;
    case "enum":
      return <EnumEditor {...editorProps} facet={def} />;
    case "string":
      return <StringEditor {...editorProps} facet={def} />;
    case "number":
      return <NumberEditor {...editorProps} facet={def} />;
    case "date":
      return <DateEditor {...editorProps} />;
  }
}

interface RowProps {
  def: FacetDef;
  isEditingTarget: boolean;
  open: boolean;
  initialValue: Value | null;
  initialNegated: boolean;
  onCommit: (next: { value: Value; negated: boolean }) => void;
  onCancel: () => void;
  onToggleRowNegate: (negated: boolean) => void;
}

function Row(props: RowProps) {
  const {
    def,
    isEditingTarget,
    open,
    initialValue,
    initialNegated,
    onCommit,
    onCancel,
    onToggleRowNegate,
  } = props;
  const rowRef = useRef<HTMLDivElement | null>(null);

  // When the popover opens in edit mode targeting this row, scroll into
  // view and focus the first focusable element inside.
  useEffect(() => {
    if (!open || !isEditingTarget) return;
    const node = rowRef.current;
    if (!node) return;
    if (typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
    const focusable = node.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open, isEditingTarget]);

  const negatable = def.negatable !== false;

  return (
    <div
      ref={rowRef}
      data-slot="search-facets-builder-row"
      data-facet-name={def.name}
      data-editing={isEditingTarget ? "true" : undefined}
      className="flex items-start gap-3 border-b border-border/50 py-2 last:border-b-0"
    >
      <div
        data-slot="search-facets-builder-row-label"
        className="min-w-24 pt-1.5 text-sm font-medium text-foreground"
      >
        {def.label ?? def.name}
      </div>
      <div className="flex-1 min-w-0">
        {renderEditor(def, {
          facet: def,
          value: initialValue,
          negated: initialNegated,
          onCommit,
          onCancel,
        })}
      </div>
      {negatable ? (
        <label
          className="inline-flex items-center gap-1.5 pt-1.5 text-xs text-muted-foreground"
          title="Negate this row"
        >
          <Checkbox.Root
            checked={initialNegated}
            onCheckedChange={(c) => onToggleRowNegate(Boolean(c))}
            className={cn(
              "peer flex size-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background shadow-xs",
              "hover:border-ring",
              "data-[checked]:bg-primary data-[checked]:border-primary data-[checked]:text-primary-foreground",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            )}
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
          not
        </label>
      ) : null}
    </div>
  );
}

/**
 * Anchored builder popover. Renders one row per `schema` entry; each row
 * uses the matching editor (or `def.renderEditor` if provided). When
 * `editingIndex` is non-null the matching row is scrolled and focused on
 * open. Editors emit a new `{value, negated}` via `onCommit`; the popover
 * translates that into either replacing the clause at `editingIndex` or
 * appending a new clause, then closes.
 */
export function BuilderPopover(props: BuilderPopoverProps) {
  const {
    schema,
    value,
    onChange,
    editingIndex,
    open,
    onOpenChange,
    anchor,
    className,
  } = props;

  // Resolve the clause currently being edited (if any) so each row can
  // pre-populate its editor.
  const editingClause: Clause | null =
    editingIndex !== null ? (value.clauses[editingIndex] ?? null) : null;

  const titleId = useId();
  const popupRef = useRef<HTMLDivElement | null>(null);

  // When opening in "add new" mode (no editingIndex), Base UI's focus trap
  // moves focus into the popup but to the popup container itself, which is
  // unhelpful for screen-reader users. Move focus to the first focusable
  // form control inside the popup so the user can immediately interact.
  useEffect(() => {
    if (!open) return;
    if (editingIndex !== null) return; // edit-mode handles its own focus
    const node = popupRef.current;
    if (!node) return;
    // Defer to next frame so Base UI's focus management runs first.
    const id = requestAnimationFrame(() => {
      const focusable = node.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, [role="radio"], [role="checkbox"], button',
      );
      focusable?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, editingIndex]);

  function commitForFacet(
    def: FacetDef,
    next: { value: Value; negated: boolean },
  ) {
    const negatable = def.negatable !== false;
    const clause: Clause = {
      facet: def.name,
      negated: negatable ? next.negated : false,
      value: next.value,
    };
    if (editingIndex !== null) {
      const nextClauses = value.clauses.slice();
      nextClauses[editingIndex] = clause;
      onChange({ ...value, clauses: nextClauses });
    } else {
      onChange({ ...value, clauses: [...value.clauses, clause] });
    }
    onOpenChange(false);
  }

  function toggleRowNegate(def: FacetDef, negated: boolean) {
    if (editingIndex === null) return;
    const current = value.clauses[editingIndex];
    if (!current || current.facet !== def.name) return;
    if (def.negatable === false) return;
    const nextClauses = value.clauses.slice();
    nextClauses[editingIndex] = { ...current, negated };
    onChange({ ...value, clauses: nextClauses });
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <Popover.Portal>
        <Popover.Positioner anchor={anchor} sideOffset={6}>
          <Popover.Popup
            ref={popupRef}
            data-slot="search-facets-builder-popup"
            aria-labelledby={titleId}
            className={cn(
              "z-50 w-[min(calc(100vw-2rem),28rem)] rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-hidden",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 transition-[opacity,scale] duration-150",
              className,
            )}
          >
            <h2 id={titleId} className="sr-only">
              {editingIndex !== null ? "Edit filter" : "Add filter"}
            </h2>
            <div role="group" aria-labelledby={titleId}>
              {schema.map((def) => {
                const isEditingTarget =
                  editingIndex !== null &&
                  editingClause?.facet === def.name;
                const initialValue =
                  isEditingTarget && editingClause
                    ? editingClause.value
                    : null;
                const initialNegated =
                  isEditingTarget && editingClause
                    ? editingClause.negated
                    : false;
                return (
                  <Row
                    key={def.name}
                    def={def}
                    isEditingTarget={isEditingTarget}
                    open={open}
                    initialValue={initialValue}
                    initialNegated={initialNegated}
                    onCommit={(next) => commitForFacet(def, next)}
                    onCancel={() => onOpenChange(false)}
                    onToggleRowNegate={(neg) => toggleRowNegate(def, neg)}
                  />
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
