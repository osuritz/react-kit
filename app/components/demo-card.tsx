import type { ReactNode } from "react";

export interface DemoCardProps {
  title: string;
  description: string;
  source: string;
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
      <pre className="bg-muted/30 max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <code>{source}</code>
      </pre>
    </section>
  );
}
