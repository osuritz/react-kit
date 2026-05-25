import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Route-level error boundary for the docs site. Wired as the `errorElement` on
 * a pathless layout route inside `SiteLayout` (see `app/router.tsx`), so a
 * render error in any drop-in route degrades to this panel *inside* the chrome
 * (header + sidebar stay put) instead of white-screening the whole site.
 * React Router clears the error on the next navigation, so the sidebar links
 * recover the user automatically.
 *
 * This is the data-router idiom — `createBrowserRouter` catches the throw and
 * routes it here via `useRouteError()`; no custom boundary class needed. (A
 * React error boundary is still the tool for non-routing subtrees, e.g. the
 * per-widget containment on the sparkline dashboard.)
 */
export function RouteErrorPanel() {
  const error = useRouteError();

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <section
      role="alert"
      className="border-destructive/30 bg-destructive/5 flex flex-col items-start gap-4 rounded-lg border p-6"
    >
      <div className="text-destructive flex items-center gap-2">
        <TriangleAlert className="size-5" />
        <h1 className="text-lg font-semibold">This page failed to render</h1>
      </div>
      <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
        Something in this route threw while rendering. The rest of the site is
        unaffected — pick another drop-in from the sidebar, or reload to try this
        page again.
      </p>
      {detail ? (
        <pre className="border-border bg-muted/40 text-muted-foreground max-w-full overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs">
          {detail}
        </pre>
      ) : null}
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Button variant="outline" render={<Link to="/" />}>
          Back to home
        </Button>
      </div>
    </section>
  );
}
