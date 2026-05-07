import buttonSrc from "#components/mode-toggle-button.tsx?raw";
import segmentedSrc from "#components/mode-toggle-segmented.tsx?raw";
import { ModeToggleButton } from "#components/mode-toggle-button.tsx";
import { ModeToggleSegmented } from "#components/mode-toggle-segmented.tsx";

export default function App() {
  return (
    <main className="bg-background text-foreground min-h-svh">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <header className="mb-10 flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            useColorScheme
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            A drop-in React hook for resolving and applying a light/dark color
            scheme. Works without a provider, persists the user choice, and
            tracks the OS preference. Two recommended toggle patterns are
            shown live below.
          </p>
          <p className="text-sm">
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="https://github.com/osuritz/react-kit/tree/main/src/hooks/color-scheme"
            >
              Hook README →
            </a>
          </p>
        </header>

        <div className="flex flex-col gap-8">
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
        </div>
      </div>
    </main>
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
    <section className="border-border bg-card text-card-foreground rounded-lg border shadow-xs">
      <header className="border-border border-b px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-border flex min-h-32 items-center justify-center border-b p-6 md:border-r md:border-b-0">
          {children}
        </div>
        <pre className="bg-muted/30 max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed">
          <code>{source}</code>
        </pre>
      </div>
    </section>
  );
}
