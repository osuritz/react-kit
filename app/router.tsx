import { createBrowserRouter, Navigate } from "react-router";
import { SiteLayout } from "./components/site-layout";
import IndexRoute from "./routes/index";
import ColorSchemeRoute from "./routes/color-scheme";
import ActionRegistryRoute from "./routes/action-registry";
import SearchFacetsRoute from "./routes/search-facets";
import KeyboardShortcutsRoute from "./routes/keyboard-shortcuts";
import CommandPaletteRoute from "./routes/command-palette";
import SparklineLineRoute from "./routes/sparkline-line";
import SparklineAreaRoute from "./routes/sparkline-area";
import SparklineBarRoute from "./routes/sparkline-bar";
import SparklineWinLossRoute from "./routes/sparkline-winloss";
import SparklineThresholdRoute from "./routes/sparkline-threshold";
import BulletGraphRoute from "./routes/bullet-graph";
import StackedBarRoute from "./routes/stacked-bar";
import GaugeRingRoute from "./routes/gauge-ring";
import HeatStripRoute from "./routes/heat-strip";
import DeltaChipRoute from "./routes/delta-chip";
import SparklineDashboardRoute from "./routes/sparkline-dashboard";
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
        { path: "sparkline-line", element: <SparklineLineRoute /> },
        { path: "sparkline-area", element: <SparklineAreaRoute /> },
        { path: "sparkline-bar", element: <SparklineBarRoute /> },
        { path: "sparkline-winloss", element: <SparklineWinLossRoute /> },
        { path: "sparkline-threshold", element: <SparklineThresholdRoute /> },
        { path: "bullet-graph", element: <BulletGraphRoute /> },
        { path: "stacked-bar", element: <StackedBarRoute /> },
        { path: "gauge-ring", element: <GaugeRingRoute /> },
        { path: "heat-strip", element: <HeatStripRoute /> },
        { path: "delta-chip", element: <DeltaChipRoute /> },
        { path: "sparkline-dashboard", element: <SparklineDashboardRoute /> },
        { path: "integration", element: <IntegrationRoute /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/react-kit" },
);
