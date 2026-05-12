import type { ReactNode } from "react";
import { CodeBlock } from "./ui/code-block";
import type { HighlightedSource } from "~/lib/shiki-source";

export interface DemoCardProps {
  title: string;
  description: string;
  source: HighlightedSource;
  render: ReactNode;
}

export function DemoCard({ title, description, source, render }: DemoCardProps) {
  return (
    <section className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs">
      <header className="border-border border-b px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </header>
      <div className="border-border flex min-h-32 items-center justify-center border-b p-6">
        {render}
      </div>
      <CodeBlock raw={source.raw} html={source.html} />
    </section>
  );
}
