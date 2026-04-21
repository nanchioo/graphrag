import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "../layout/AppShell";
import { DashboardPage } from "../../pages/dashboard/DashboardPage";
import { GraphVisualizationPage } from "../../pages/graph-viz/GraphVisualizationPage";
import { DataSourcesPage } from "../../pages/data-sources/DataSourcesPage";
import { EntityBrowserPage } from "../../pages/browse/EntityBrowserPage";
import { JobMonitorPage } from "../../pages/jobs/JobMonitorPage";
import { DifyIntegrationPage } from "../../pages/dify/DifyIntegrationPage";
import { GraphManagementPage } from "../../pages/graphs/GraphManagementPage";
import { QueryWorkbenchPage } from "../../pages/query/QueryWorkbenchPage";
import { SettingsPage } from "../../pages/settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/graphs", element: <GraphManagementPage /> },
      { path: "/graphs/:graphId/viz", element: <GraphVisualizationPage /> },
      { path: "/sources", element: <DataSourcesPage /> },
      { path: "/query", element: <QueryWorkbenchPage /> },
      { path: "/browse", element: <EntityBrowserPage /> },
      { path: "/jobs", element: <JobMonitorPage /> },
      { path: "/dify", element: <DifyIntegrationPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});
