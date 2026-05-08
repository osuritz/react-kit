# search-facets

A drop-in faceted search bar for React. Schema-driven, controlled by an AST,
and composed over [Base UI](https://base-ui.com/)'s `Combobox` and `Popover`
primitives so it inherits accessibility and themability for free. Gmail-flavor
grammar — `field:value`, `-field:value` negation, quoted phrases, and free
text alongside facets — with a builder popover for syntax discovery and a
controlled `Query` AST as the round-tripping source of truth. No npm package,
no build step — copy the files into your app.

> **You don't need this component for a plain text search box.** Reach for it
> when filtering has more than two or three orthogonal axes and users will be
> mixing them. If your search is a single string and you don't need
> structured filters, render an `<input>` and ship.

## What to copy

Copy these files into your project (e.g. `src/components/search-facets/`):

- `search-facets.tsx` — top-level `<SearchFacets/>`
- `chip-strip.tsx` — internal: chip strip + input
- `builder-popover.tsx` — internal: anchored builder form
- `editors/{boolean,enum,string,number,date}-editor.tsx` — per-type value editors
- `grammar/{types.ts,parse.ts,stringify.ts,partial.ts}` — pure grammar layer
- `use-search-facets.ts` — internal state hook
- `use-query-param-sync.ts` — *(optional)* URL persistence helper
- `lib/cn.ts` — local class-name composer (shadcn idiom)
- *(optional)* this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `*.test.tsx`, `grammar/*.test.ts`) are
the **verification harness** — they live alongside the drop-in so `npm test`
works here, but they're not part of what you copy into your app.

There is no `search-facets.css`. Styling lives in Tailwind utilities applied
via `cn()` inside the component files, using the standard shadcn theme
tokens (`bg-popover`, `text-popover-foreground`, `border-input`, ...). To
restyle, either pass a `className` to `<SearchFacets/>` (which merges via
`tailwind-merge`) or edit the source — drop-ins are designed to be forked.

Peer requirements:

- React 18+ (works in 18 and 19)
- `@base-ui/react` (≥ 1.4)
- `clsx` (≥ 2) and `tailwind-merge` (≥ 2) for the local `cn()` helper
- Tailwind CSS v4 + the shadcn theme tokens defined on `:root` — see
  [`shadcn/tailwind.css`](https://ui.shadcn.com/docs/tailwind-v4) or run
  `npx shadcn init` once. Without these tokens the component renders
  unstyled (no background on the popups, no chip colors, etc.).
- `react-day-picker` (≥ 9.1) — **only required if your schema declares any
  `date` facet.** Delete `editors/date-editor.tsx` if you don't use dates,
  and the peer drops away.

## Quick start

```tsx
import "react-day-picker/style.css"; // only if you use date facets
import { useState } from "react";
import { SearchFacets } from "./components/search-facets/search-facets";
import type { FacetSchema, Query } from "./components/search-facets/grammar/types";

const schema: FacetSchema = [
  { name: "from",    type: "string", label: "From" },
  { name: "to",      type: "string", label: "To" },
  { name: "subject", type: "string", label: "Subject", allowWildcard: true },
  { name: "has",     type: "boolean", values: ["attachment", "star"] },
  { name: "label",   type: "enum",
    values: [{ value: "spam" }, { value: "inbox" }] },
  { name: "size",    type: "number", ops: ["gte", "lte", "range"] },
  { name: "after",   type: "date",   ops: ["gte"] },
];

export function MailFilter() {
  const [query, setQuery] = useState<Query>({ clauses: [], freeText: "" });
  return (
    <SearchFacets
      schema={schema}
      value={query}
      onChange={setQuery}
      placeholder="Search mail..."
    />
  );
}
```

## Grammar (v1)

| Form                          | Example                              | AST                                                          |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `field:value`                 | `from:bob`                           | `{ facet:"from", negated:false, value:{kind:"literal",raw:"bob"} }` |
| `-field:value` (negation)     | `-label:spam`                        | `{ ..., negated:true }`                                      |
| `field:"with spaces"`         | `from:"alice cooper"`                | `{ ..., value:{kind:"literal",raw:"alice cooper"} }`         |
| `field:>=N` / `<=N` / `=N`    | `size:>=1024`                        | `{ ..., value:{kind:"compare",op:"gte",raw:"1024"} }`        |
| `field:from..to` (range)      | `size:100..500`                      | `{ ..., value:{kind:"range",from:"100",to:"500"} }`          |
| Free text                     | `urgent`                             | added to `Query.freeText`                                    |
| Implicit AND                  | `from:bob has:attachment`            | two clauses; consumer ANDs them                              |

Facet types and the values they accept:

| Type      | Value shape on AST                                     | Notes                                                  |
| --------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `boolean` | `{kind:"literal",raw:<one of facet.values>}`           | renders `has:attachment`                               |
| `enum`    | `{kind:"literal",raw:<one of facet.values[].value>}`   | each entry can carry an optional `label`               |
| `string`  | `{kind:"literal",raw:<text>}`                          | `allowWildcard` enables `*`; consumer interprets       |
| `number`  | `literal`/`compare`/`range`, gated by `facet.ops`      | `eq` is omitted when `ops === ["eq"]` (uses `literal`) |
| `date`    | same shape as `number`; values are ISO `YYYY-MM-DD`    | requires the `react-day-picker` peer                   |

What's **out** of v1 (and why):

- Async value autocomplete inside the main input — schema field exists so
  drop-ins won't break when v2 adds it.
- Explicit boolean operators (`AND`/`OR`/parens). v1 is implicit-AND only.
- Saved searches, query history, server suggestions baked in. The schema
  accepts an `autocomplete` callback so consumers can wire their own.
- URL persistence inside the component itself. Use the optional
  [`useQueryParamSync`](#usequeryparamsyncvalue-onchange-options) helper.

## API

### `<SearchFacets>` props

| Prop                  | Type                                    | Required | Default        |
| --------------------- | --------------------------------------- | -------- | -------------- |
| `schema`              | `FacetSchema`                           | yes      | —              |
| `value`               | `Query`                                 | yes      | —              |
| `onChange`            | `(next: Query) => void`                 | yes      | —              |
| `placeholder`         | `string`                                | no       | —              |
| `className`           | `string`                                | no       | —              |
| `onSubmit`            | `(q: Query) => void`                    | no       | —              |
| `renderBuilderTrigger`| `(api: BuilderTriggerApi) => ReactNode` | no       | default button |

`className` is merged with the component's defaults via `tailwind-merge`,
so caller-provided classes win. For deeper restyling, the component
files surface `data-slot` attributes (`search-facets`,
`search-facets-input-group`, `search-facets-chip`, `search-facets-trigger`,
`search-facets-builder-popup`, `search-facets-suggestions`, etc.) you can
target from your own CSS — or just fork the file and edit, which is what
shadcn-style drop-ins are designed for.

### Helpers

```ts
parseQuery(input: string, schema: FacetSchema): { ast: Query; errors: ParseError[] };
queryToString(ast: Query): string;
```

`parseQuery` and `queryToString` round-trip: `parseQuery(queryToString(ast), schema).ast`
deep-equals `ast` for any AST that uses facets in the schema. Tokens whose
field isn't in the schema are folded into `freeText` and a non-fatal error
is appended to `errors`.

### `useQueryParamSync(value, onChange, options)`

Optional URL-persistence helper. On mount, reads `?<paramKey>=...` and calls
`onChange` if it parses to a different AST than the incoming `value`. On
`value` changes, writes the canonical string back to the URL. On `popstate`,
re-syncs from the URL. Defaults to `history.replaceState` to avoid history
pollution while typing; pass `history: "push"` to opt into push semantics.

```ts
useQueryParamSync(value, setValue, { schema, paramKey: "q" });
```

## Customizing editors

Each `FacetDef` carries optional `renderChip` and `renderEditor` slots. When
provided they replace the built-in implementations for that facet. Use this
to render a multi-select editor for a string facet, or an icon-rich chip for
a custom facet, without forking the component.

```ts
const schema: FacetSchema = [
  {
    name: "owner",
    type: "string",
    label: "Owner",
    renderEditor: (props) => <OwnerPicker {...props} />,
  },
];
```

## Testing this drop-in

The harness ships a Vitest setup so you can verify before copying:

```bash
npm install
npx tsc --noEmit
npm test
```

Suites cover: tokenizer / parser / stringifier / partial-parser (pure TS),
parse-on-space, chip removal via Backspace, negation toggle, controlled
round-trip, free-text + facet interleaving, facet-name autocomplete, and the
hook contract.

## Design notes

- **Schema is the source of truth for what facets exist; the AST is the
  source of truth for what the user has expressed.** The component never
  derives one from the other — it only renders.
- **Provider-less by default.** The component is fully controllable via
  `value`/`onChange`; no context required for basic use.
- **Three layers, independently testable.** Grammar (pure TS, no React) →
  state hook (no UI) → presentation (Base UI + the date-picker peer). You
  can use `parseQuery` / `queryToString` standalone without rendering
  anything.
- **Chips render inside the input** via `Combobox.Chips` (not in a separate
  bar). Free text continues to the right of the chips. This is idiomatic for
  Base UI's multi-select shape and matches Gmail / Linear / GitHub UX.
- **Parse-on-space** turns `from:bob ` into a chip the moment the user types
  the trailing space. Quoted runs (`from:"a `) are detected and don't
  prematurely commit.
- **Negation is a first-class chip state** with a toggle affordance and a
  distinct visual treatment (a `cva` variant on the chip swaps to
  `bg-destructive/10 text-destructive`). Schemas can opt out per-facet
  with `negatable: false`.
- **Styling follows the shadcn idiom.** Tailwind utilities are applied
  inline via a local `cn()` (`clsx` + `tailwind-merge`), and the component
  reads from the standard shadcn theme tokens — no separate CSS file, no
  prefixed `--search-facets-*` variables. To restyle: pass a `className`
  to the root, edit the file, or override with descendant selectors via
  the `data-slot` attributes.
- **`react-day-picker` is an optional peer.** If your schema doesn't declare
  a `date` facet, delete `editors/date-editor.tsx` and the peer drops out.
