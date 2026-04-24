import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { navigationItems } from "./content/workbench";
import { GraphManagePage } from "./pages/GraphManagePage";
import { ModelConfigPage } from "./pages/ModelConfigPage";
import { QueryPage } from "./pages/QueryPage";

const NAV_DESCRIPTIONS: Record<string, string> = {
  "/graphs": "Projects, files, builds",
  "/models": "Providers and defaults",
  "/query": "Ask and inspect context",
};

const ICONS: Record<string, JSX.Element> = {
  "/graphs": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.75a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z" />
      <path d="M5.5 15.75a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Z" />
      <path d="M18.5 15.75a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Z" />
      <path d="M10.35 10.05 6.95 16.1M13.65 10.05l3.4 6.05" />
    </svg>
  ),
  "/models": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v6.5A2.75 2.75 0 0 1 16.25 15h-8.5A2.75 2.75 0 0 1 5 12.25v-6.5Z" />
      <path d="M8 19h8M12 15v4" />
      <path d="M8.5 7.5h7M8.5 10.5h4.75" />
    </svg>
  ),
  "/query": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.75 18.5a7.75 7.75 0 1 1 0-15.5 7.75 7.75 0 0 1 0 15.5Z" />
      <path d="m16.5 16.5 4 4" />
      <path d="M8.25 9.25a2.5 2.5 0 0 1 4.85.86c0 1.76-2.35 2.03-2.35 3.39M10.75 15.5h.01" />
    </svg>
  ),
};

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey =
    navigationItems.find((item) => location.pathname.startsWith(item.key))?.key ??
    "/graphs";

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => navigate("/graphs")}
          aria-label="Go to GraphRAG projects"
        >
          <span className="sidebar-logo">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path className="layer" d="M5 8.3 12 4.7l7 3.6-7 3.6-7-3.6Z" />
              <path className="layer" d="M5 12.3 12 15.9l7-3.6" />
              <path className="layer" d="M5 16.1 12 19.7l7-3.6" />
              <path d="M8.7 8.4h6.6M9.6 14.2l4.8-5.2M14.4 14.2 9.6 9" />
              <circle cx="8.7" cy="8.4" r="1.25" />
              <circle cx="15.3" cy="8.4" r="1.25" />
              <circle cx="12" cy="14.5" r="1.25" />
            </svg>
          </span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-title">GraphRAG</span>
            <span className="sidebar-brand-subtitle">Admin Console</span>
          </span>
        </button>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`sidebar-nav-item${selectedKey === item.key ? " active" : ""}`}
              onClick={() => navigate(item.key)}
              aria-current={selectedKey === item.key ? "page" : undefined}
            >
              <span className="sidebar-nav-icon">{ICONS[item.key] ?? null}</span>
              <span className="sidebar-nav-copy">
                <span className="sidebar-nav-label">{item.label}</span>
                <span className="sidebar-nav-description">
                  {NAV_DESCRIPTIONS[item.key] ?? "Workspace"}
                </span>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-kicker">Workspace</div>
          <div className="sidebar-footer-title">Local GraphRAG</div>
          <div className="sidebar-footer-copy">Light dashboard layout</div>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/graphs" replace />} />
            <Route path="/graphs" element={<GraphManagePage />} />
            <Route path="/graphs/:graphId" element={<GraphManagePage />} />
            <Route path="/models" element={<ModelConfigPage />} />
            <Route path="/query" element={<QueryPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  );
}
