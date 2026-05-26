import { DemoCard, type DemoCardProps } from './demo-card';

export interface DropInPageProps {
  title: string;
  description: string;
  sourceHref: string;
  readmeHref: string;
  demos: ReadonlyArray<DemoCardProps>;
}

export function DropInPage({ title, description, sourceHref, readmeHref, demos }: DropInPageProps) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">{description}</p>
        <p className="flex gap-4 text-sm">
          <a className="text-primary underline-offset-4 hover:underline" href={readmeHref}>
            README →
          </a>
          <a className="text-primary underline-offset-4 hover:underline" href={sourceHref}>
            Source on GitHub →
          </a>
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {demos.map((demo) => (
          <DemoCard key={demo.title} {...demo} />
        ))}
      </div>
    </article>
  );
}
