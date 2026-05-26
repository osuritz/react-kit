import { useState } from 'react';
import 'react-day-picker/style.css';
import { SearchFacets } from '#components/search-facets/search-facets.tsx';
import type { FacetSchema, Query } from '#components/search-facets/grammar/types.ts';
import { queryToString } from '#components/search-facets/grammar/stringify.ts';

const schema: FacetSchema = [
  { name: 'from', type: 'string', label: 'From' },
  { name: 'to', type: 'string', label: 'To' },
  {
    name: 'subject',
    type: 'string',
    label: 'Subject',
    allowWildcard: true,
  },
  {
    name: 'has',
    type: 'boolean',
    values: ['attachment', 'star'],
    label: 'Has',
  },
  {
    name: 'label',
    type: 'enum',
    label: 'Label',
    values: [{ value: 'spam' }, { value: 'inbox' }, { value: 'important' }],
  },
  {
    name: 'size',
    type: 'number',
    label: 'Size',
    ops: ['gte', 'lte', 'range'],
    unit: 'bytes',
  },
  { name: 'after', type: 'date', label: 'After', ops: ['gte'] },
];

export function SearchFacetsDemo() {
  const [query, setQuery] = useState<Query>({ clauses: [], freeText: '' });
  return (
    <div className="flex flex-col gap-3">
      <SearchFacets
        schema={schema}
        value={query}
        onChange={setQuery}
        placeholder="Search mail..."
      />
      <pre className="bg-muted/30 max-h-32 overflow-auto rounded p-3 font-mono text-xs">
        <code>
          {queryToString(query) || '<empty>'}
          {'\n\n'}
          {JSON.stringify(query, null, 2)}
        </code>
      </pre>
    </div>
  );
}
