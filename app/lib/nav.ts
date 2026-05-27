/**
 * Single source of truth for site navigation.
 *
 * The sidebar (desktop), the mobile drawer, and the home-page grid all derive
 * from this one list, so they can never drift apart. The list is generated
 * from the per-page MDX frontmatter in `app/routes/*.mdx` (see `./pages`): each
 * page declares its `group`, `order`, and `blurb`, and its route path is its
 * filename. So adding a page surfaces it in every navigation surface at once,
 * and — because `to` is the filename — a nav entry can never point at a route
 * that doesn't exist. (A new sparkline family was once added to the sidebar
 * but not the home grid, which left it invisible on mobile.)
 */
import { navGroups } from './pages';

export type { NavItem, NavGroup } from './page-types';

export const NAV_GROUPS = navGroups;
