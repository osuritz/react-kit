import { Link } from "react-router";
import { NAV_GROUPS } from "~/lib/nav";

export default function IndexRoute() {
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          react-kit
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          Lightweight, copy-paste React hooks and components for common
          frontend patterns. Each entry below is a self-contained drop-in
          with its own README and verification harness — no npm install,
          no build step, just copy the folder.
        </p>
      </header>

      {NAV_GROUPS.map((group) => (
        <section key={group.heading} className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {group.heading}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="border-border bg-card hover:bg-muted/50 block h-full rounded-lg border p-4 transition-colors"
                >
                  <h3 className="text-base font-semibold">{item.label}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.blurb}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
