import { useEffect, useId, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { Dialog } from '@base-ui/react/dialog';
import { Menu, X } from 'lucide-react';
import { NAV_GROUPS } from '~/lib/nav';
import { repoRootUrl } from '~/lib/github';
import { cn } from '~/lib/utils';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/**
 * Grouped link list shared by the desktop sidebar and the mobile drawer.
 * `onNavigate` lets the drawer close itself when a link is followed.
 */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  // NavList renders in both the (display:none) desktop sidebar and the mobile
  // drawer, so both live in the DOM at once. A per-instance base id keeps the
  // group label ids unique instead of colliding on `nav-group-hooks` etc.
  const baseId = useId();
  return (
    <ul className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => {
        const labelId = `${baseId}-${group.heading.toLowerCase()}`;
        return (
          <li key={group.heading} className="flex flex-col">
            <div id={labelId} className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
              {group.heading}
            </div>
            <ul aria-labelledby={labelId} className="flex flex-col">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        'block rounded-md px-3 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-foreground ring-1 ring-inset ring-border'
                          : 'text-foreground/85 hover:text-foreground hover:bg-accent',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  // The drawer only exists below `md`; if the viewport grows past the
  // breakpoint while it's open, close it so Base UI releases the body
  // scroll lock (otherwise the page would be silently unscrollable).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const closeIfDesktop = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', closeIfDesktop);
    return () => mq.removeEventListener('change', closeIfDesktop);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-svh">
      {/* Reset window scroll to top on navigation (and restore it on
          back/forward). React Router's data router doesn't do this by
          default, so navigating between long pages kept the prior scroll
          offset. */}
      <ScrollRestoration />
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger
                aria-label="Open navigation menu"
                className="text-foreground hover:bg-accent -ml-2 inline-flex size-9 items-center justify-center rounded-md transition-colors md:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop
                  className={cn(
                    'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm',
                    'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
                    'transition-opacity duration-150',
                    'md:hidden'
                  )}
                />
                <Dialog.Popup
                  className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col gap-4 overflow-y-auto',
                    'border-border bg-background border-r p-4 shadow-lg outline-none',
                    'data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full',
                    'transition-transform duration-200',
                    'md:hidden'
                  )}
                >
                  <div className="flex items-center justify-between px-3">
                    <Dialog.Title className="text-sm font-semibold">react-kit</Dialog.Title>
                    <Dialog.Close
                      aria-label="Close navigation menu"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground -mr-2 inline-flex size-9 items-center justify-center rounded-md transition-colors"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">
                    Browse react-kit hooks, components, sparklines, and demos.
                  </Dialog.Description>
                  <nav aria-label="Primary">
                    <NavList onNavigate={() => setMenuOpen(false)} />
                  </nav>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>

            <NavLink to="/" className="text-base font-semibold tracking-tight hover:opacity-80">
              react-kit
            </NavLink>
          </div>

          <a
            className="text-foreground hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            href={repoRootUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon className="size-5" />
            GitHub
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-8 md:py-12">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-48 shrink-0 overflow-y-auto md:block">
          <nav aria-label="Primary">
            <NavList />
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
