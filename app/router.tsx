import { createBrowserRouter, Navigate } from 'react-router';
import { SiteLayout } from './components/site-layout';
import { RouteErrorPanel } from './components/route-error';
import IndexRoute from './routes/index';
import { routeChildren } from './lib/pages';

export const router = createBrowserRouter(
  [
    {
      element: <SiteLayout />,
      // Pathless layout route: its `errorElement` catches render (and loader/
      // action) errors from any child below and renders the panel into
      // SiteLayout's <Outlet>, so the header + sidebar survive a broken route.
      children: [
        {
          errorElement: <RouteErrorPanel />,
          // One child per drop-in page is generated from `app/routes/*.mdx`
          // frontmatter — see `./lib/pages`. Adding a page needs no edit here.
          children: [
            { path: '/', element: <IndexRoute /> },
            ...routeChildren,
            { path: '*', element: <Navigate to="/" replace /> },
          ],
        },
      ],
    },
  ],
  { basename: '/react-kit' }
);
