import type { ReactNode } from "react";

export type Query = {
  clauses: Clause[];
  freeText: string;
};

export type Clause = {
  facet: string;
  negated: boolean;
  value: Value;
};

export type Value =
  | { kind: "literal"; raw: string }
  | { kind: "compare"; op: CompareOp; raw: string }
  | { kind: "range"; from: string; to: string };

export type CompareOp = "eq" | "gte" | "lte";

export interface ParseError {
  message: string;
  index: number;
  length: number;
}

export type FacetSchema = ReadonlyArray<FacetDef>;

export type FacetType = "boolean" | "enum" | "string" | "number" | "date";

export interface BaseFacet {
  name: string;
  label?: string;
  description?: string;
  negatable?: boolean;
  renderChip?: (chip: ChipModel) => ReactNode;
  renderEditor?: (props: EditorProps) => ReactNode;
}

export interface BooleanFacet extends BaseFacet {
  type: "boolean";
  values: string[];
}

export interface EnumFacet extends BaseFacet {
  type: "enum";
  values: Array<{ value: string; label?: string }>;
}

export interface StringFacet extends BaseFacet {
  type: "string";
  allowWildcard?: boolean;
  autocomplete?: (q: string) => Promise<string[]> | string[];
}

export interface NumberFacet extends BaseFacet {
  type: "number";
  ops?: Array<"eq" | "gte" | "lte" | "range">;
  unit?: string;
}

export interface DateFacet extends BaseFacet {
  type: "date";
  ops?: Array<"eq" | "gte" | "lte" | "range">;
}

export type FacetDef =
  | BooleanFacet
  | EnumFacet
  | StringFacet
  | NumberFacet
  | DateFacet;

export interface ChipModel {
  index: number;
  clause: Clause;
  facetDef: FacetDef | null;
}

export interface EditorProps {
  facet: FacetDef;
  value: Value | null;
  negated: boolean;
  onCommit: (next: { value: Value; negated: boolean }) => void;
  onCancel: () => void;
}

export function findFacet(
  schema: FacetSchema,
  name: string,
): FacetDef | undefined {
  return schema.find((f) => f.name === name);
}
