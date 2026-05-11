import { DropInPage } from "~/components/drop-in-page";
import { SearchFacetsDemo } from "~/components/demos/search-facets";
import searchFacetsSrc from "~/components/demos/search-facets.tsx?raw";

export default function SearchFacetsRoute() {
  return (
    <DropInPage
      title="SearchFacets"
      description="A schema-driven faceted search bar — Gmail-flavor field:value chips, quoted phrases, negation, ranges, and a builder popover for syntax discovery. Composed over Base UI's Combobox and Popover; styled with shadcn theme tokens."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/components/search-facets"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/components/search-facets/README.md"
      demos={[
        {
          title: "Faceted search",
          description:
            "Type 'from:bob' + space to commit a chip. Click a chip to edit it. Click '+ Add filter' for the schema-driven builder form.",
          source: searchFacetsSrc,
          render: <SearchFacetsDemo />,
        },
      ]}
    />
  );
}
