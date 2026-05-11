import { createBrowserRouter, Navigate } from "react-router";
import { SiteLayout } from "./components/site-layout";
import IndexRoute from "./routes/index";
import ColorSchemeRoute from "./routes/color-scheme";
import ActionRegistryRoute from "./routes/action-registry";
import SearchFacetsRoute from "./routes/search-facets";
import KeyboardShortcutsRoute from "./routes/keyboard-shortcuts";
import CommandPaletteRoute from "./routes/command-palette";
import IntegrationRoute from "./routes/integration";

export const router = createBrowserRouter(
  [
    {
      element: <SiteLayout />,
      children: [
        { path: "/", element: <IndexRoute /> },
        { path: "color-scheme", element: <ColorSchemeRoute /> },
        { path: "action-registry", element: <ActionRegistryRoute /> },
        { path: "search-facets", element: <SearchFacetsRoute /> },
        { path: "keyboard-shortcuts", element: <KeyboardShortcutsRoute /> },
        { path: "command-palette", element: <CommandPaletteRoute /> },
        { path: "integration", element: <IntegrationRoute /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/react-kit" },
);
