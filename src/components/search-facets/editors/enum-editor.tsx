import { useEffect, useRef, useState } from "react";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Checkbox } from "@base-ui/react/checkbox";
import type { EditorProps, EnumFacet, Value } from "../grammar/types";

export interface EnumEditorProps extends EditorProps {
  facet: EnumFacet;
  classNames?: { editor?: string };
}

/**
 * Single-row editor for `EnumFacet`. Renders `values: Array<{value, label?}>`
 * as radio buttons (using the optional label for display) and a Negate toggle.
 */
export function EnumEditor(props: EnumEditorProps) {
  const { facet, value, negated, onCommit, classNames } = props;

  const initialRaw =
    value && value.kind === "literal"
      ? value.raw
      : (facet.values[0]?.value ?? "");
  const [selected, setSelected] = useState<string>(initialRaw);
  const [neg, setNeg] = useState<boolean>(negated);
  const firstRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelected(initialRaw);
    setNeg(negated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, negated]);

  const negatable = facet.negatable !== false;

  function handleApply() {
    const next: Value = { kind: "literal", raw: selected };
    onCommit({ value: next, negated: negatable ? neg : false });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  }

  return (
    <div
      className={classNames?.editor}
      data-facet-type="enum"
      onKeyDown={handleKeyDown}
    >
      <RadioGroup
        value={selected}
        onValueChange={(v) => setSelected(String(v))}
        aria-label={facet.label ?? facet.name}
      >
        {facet.values.map((v, idx) => (
          <label
            key={v.value}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}
          >
            <Radio.Root
              value={v.value}
              inputRef={idx === 0 ? firstRef : undefined}
            >
              <Radio.Indicator />
            </Radio.Root>
            <span>{v.label ?? v.value}</span>
          </label>
        ))}
      </RadioGroup>
      {negatable ? (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <Checkbox.Root checked={neg} onCheckedChange={(c) => setNeg(Boolean(c))}>
            <Checkbox.Indicator />
          </Checkbox.Root>
          <span>Negate</span>
        </label>
      ) : null}
      <button type="button" onClick={handleApply} style={{ marginLeft: 8 }}>
        Apply
      </button>
    </div>
  );
}
