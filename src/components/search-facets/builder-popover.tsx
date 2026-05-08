import { useEffect, useRef } from "react";
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
  classNames?: {
    popup?: string;
    row?: string;
    rowLabel?: string;
    editor?: string;
  };
}

/**
 * Pick the right editor for a given facet definition. `def.renderEditor`
 * always wins; otherwise we dispatch on `def.type`. Date editors are
 * intentionally not implemented here — Phase 2d wires those in.
 */
function renderEditor(
  def: FacetDef,
  editorProps: EditorProps,
  classNames?: BuilderPopoverProps["classNames"],
) {
  if (def.renderEditor) {
    return def.renderEditor(editorProps);
  }
  switch (def.type) {
    case "boolean":
      return (
        <BooleanEditor
          {...editorProps}
          facet={def}
          classNames={{ editor: classNames?.editor }}
        />
      );
    case "enum":
      return (
        <EnumEditor
          {...editorProps}
          facet={def}
          classNames={{ editor: classNames?.editor }}
        />
      );
    case "string":
      return (
        <StringEditor
          {...editorProps}
          facet={def}
          classNames={{ editor: classNames?.editor }}
        />
      );
    case "number":
      return (
        <NumberEditor
          {...editorProps}
          facet={def}
          classNames={{ editor: classNames?.editor }}
        />
      );
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
  classNames?: BuilderPopoverProps["classNames"];
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
    classNames,
  } = props;
  const rowRef = useRef<HTMLDivElement | null>(null);

  // When the popover opens in edit mode targeting this row, scroll into
  // view and focus the first focusable element inside.
  useEffect(() => {
    if (!open || !isEditingTarget) return;
    const node = rowRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "nearest" });
    const focusable = node.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open, isEditingTarget]);

  const negatable = def.negatable !== false;

  return (
    <div
      ref={rowRef}
      className={classNames?.row}
      data-facet-name={def.name}
      data-editing={isEditingTarget ? "true" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
    >
      <div
        className={classNames?.rowLabel}
        style={{ minWidth: 96, fontWeight: 500 }}
      >
        {def.label ?? def.name}
      </div>
      <div style={{ flex: 1 }}>
        {renderEditor(
          def,
          {
            facet: def,
            value: initialValue,
            negated: initialNegated,
            onCommit,
            onCancel,
          },
          classNames,
        )}
      </div>
      {negatable ? (
        <label
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          title="Negate this row"
        >
          <Checkbox.Root
            checked={initialNegated}
            onCheckedChange={(c) => onToggleRowNegate(Boolean(c))}
          >
            <Checkbox.Indicator />
          </Checkbox.Root>
          <span style={{ fontSize: "0.85em" }}>not</span>
        </label>
      ) : null}
    </div>
  );
}

/**
 * Anchored builder popover. Renders one row per `schema` entry; each row
 * uses the matching editor (or `def.renderEditor` if provided). When
 * `editingIndex` is non-null the matching row is scrolled and focused on
 * open. Editors emit a new `{value, negated}` via `onCommit`; the
 * popover translates that into either replacing the clause at
 * `editingIndex` or appending a new clause, then closes.
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
    classNames,
  } = props;

  // Resolve the clause currently being edited (if any) so each row can
  // pre-populate its editor.
  const editingClause: Clause | null =
    editingIndex !== null ? (value.clauses[editingIndex] ?? null) : null;

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
    // Only meaningful when editing an existing clause for this facet.
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
        <Popover.Positioner anchor={anchor} sideOffset={4}>
          <Popover.Popup className={classNames?.popup}>
            <div role="group" aria-label="Add filter">
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
                    classNames={classNames}
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

