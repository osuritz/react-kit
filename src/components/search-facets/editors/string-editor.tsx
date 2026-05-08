import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import type { EditorProps, StringFacet, Value } from "../grammar/types";

export interface StringEditorProps extends EditorProps {
  facet: StringFacet;
  classNames?: { editor?: string };
}

/**
 * Single-row editor for `StringFacet`. A free-text input that emits a
 * `literal` Value on commit. When `allowWildcard` is true, a small hint
 * about `*` is surfaced inline.
 */
export function StringEditor(props: StringEditorProps) {
  const { facet, value, negated, onCommit, classNames } = props;

  const initialRaw =
    value && value.kind === "literal" ? value.raw : "";
  const [text, setText] = useState<string>(initialRaw);
  const [neg, setNeg] = useState<boolean>(negated);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText(initialRaw);
    setNeg(negated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, negated]);

  const negatable = facet.negatable !== false;

  function handleApply() {
    if (text.length === 0) return;
    const next: Value = { kind: "literal", raw: text };
    onCommit({ value: next, negated: negatable ? neg : false });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  }

  return (
    <div className={classNames?.editor} data-facet-type="string">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={facet.label ?? facet.name}
        placeholder={facet.label ?? facet.name}
      />
      {facet.allowWildcard ? (
        <span style={{ marginLeft: 8, opacity: 0.7, fontSize: "0.85em" }}>
          (use <code>*</code> as wildcard)
        </span>
      ) : null}
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
