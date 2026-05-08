import buttonSrc from "#components/mode-toggle-button-demo.tsx?raw";
import segmentedSrc from "#components/mode-toggle-segmented-demo.tsx?raw";
import searchFacetsSrc from "#components/search-facets-demo.tsx?raw";
import { ModeToggleButton } from "#components/mode-toggle-button-demo.tsx";
import { ModeToggleSegmented } from "#components/mode-toggle-segmented-demo.tsx";
import { SearchFacetsDemo } from "#components/search-facets-demo.tsx";

export default function App() {
  return (
    <main className="bg-background text-foreground min-h-svh">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <header className="mb-12 flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            react-kit
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            Lightweight, copy-paste React hooks and components for common
            frontend patterns. Each entry below is a self-contained drop-in
            with its own README and verification harness — no npm install,
            no build step, just copy the folder.
          </p>
          <p className="text-sm">
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="https://github.com/osuritz/react-kit"
            >
              Repo on GitHub →
            </a>
          </p>
        </header>

        <div className="flex flex-col gap-16">
          <DropIn
            id="use-color-scheme"
            heading="useColorScheme"
            description="A drop-in React hook for resolving and applying a light/dark color scheme. Works without a provider, persists the user choice, and tracks the OS preference. Two recommended toggle patterns are shown below."
            href="https://github.com/osuritz/react-kit/tree/main/src/hooks/color-scheme"
          >
            <DemoCard
              title="Light / dark button"
              description="Two-state icon button. Setting either light or dark is explicit — clicking breaks 'system' tracking."
              source={buttonSrc}
            >
              <ModeToggleButton />
            </DemoCard>

            <DemoCard
              title="Light / dark / system segmented"
              description="Three-state segmented control bound to the user choice. When 'system' is selected, the resolved scheme is shown below."
              source={segmentedSrc}
            >
              <ModeToggleSegmented />
            </DemoCard>
          </DropIn>

          <DropIn
            id="search-facets"
            heading="SearchFacets"
            description="A schema-driven faceted search bar — Gmail-flavor field:value chips, quoted phrases, negation, ranges, and a builder popover for syntax discovery. Composed over Base UI's Combobox and Popover; styled with shadcn theme tokens."
            href="https://github.com/osuritz/react-kit/tree/main/src/components/search-facets"
          >
            <DemoCard
              title="Faceted search"
              description="Type 'from:bob' + space to commit a chip. Click a chip to edit it. Click '+ Add filter' for the schema-driven builder form."
              source={searchFacetsSrc}
            >
              <SearchFacetsDemo />
            </DemoCard>
          </DropIn>
        </div>
      </div>
    </main>
  );
}

function DropIn({
  id,
  heading,
  description,
  href,
  children,
}: {
  id: string;
  heading: string;
  description: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex scroll-mt-8 flex-col gap-6"
    >
      <header className="flex flex-col gap-2">
        <h2
          id={`${id}-heading`}
          className="text-2xl font-semibold tracking-tight md:text-3xl"
        >
          {heading}
        </h2>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          {description}
        </p>
        <p className="text-sm">
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={href}
          >
            README →
          </a>
        </p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function DemoCard({
  title,
  description,
  source,
  children,
}: {
  title: string;
  description: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs">
      <header className="border-border border-b px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </header>
      <div className="border-border flex min-h-32 items-center justify-center border-b p-6">
        {children}
      </div>
      <pre className="bg-muted/30 max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <code>{source}</code>
      </pre>
    </section>
  );
}
