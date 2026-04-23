import { Layout, Menu, Typography } from "antd";
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

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey =
    navigationItems.find((item) => location.pathname.startsWith(item.key))?.key ??
    "/graphs";

  return (
    <Layout className="app-shell analysis-shell">
      <header className="app-header analysis-header">
        <div className="brand-block analysis-brand">
          <span className="brand-kicker analysis-kicker">GraphRAG Workbench</span>
          <Typography.Title level={2} className="brand-title">
            知识图谱管理后台
          </Typography.Title>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={navigationItems}
          className="nav-menu analysis-nav-menu"
          onClick={({ key }) => navigate(key)}
        />
      </header>
      <Layout.Content className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/graphs" replace />} />
          <Route path="/graphs" element={<GraphManagePage />} />
          <Route path="/models" element={<ModelConfigPage />} />
          <Route path="/query" element={<QueryPage />} />
        </Routes>
      </Layout.Content>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  );
}
