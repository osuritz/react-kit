import { IntegrationDemo } from '~/components/demos/integration';
import { repoBlobUrl } from '~/lib/github';

export default function IntegrationRoute() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Integration</h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          All three action drop-ins wired together. Exercises the seams between action-registry,
          keyboard-shortcuts, and command-palette — surface attribution via <code>ctx.source</code>,
          live disable, mount/unmount cleanup, <code>allowInInput</code> suppression, async sources,
          and the <code>palette.open</code> action.
        </p>
        <p className="text-sm">
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={repoBlobUrl('app/components/demos/integration.tsx')}
          >
            View source on GitHub →
          </a>
        </p>
      </header>

      <IntegrationDemo />
    </article>
  );
}
