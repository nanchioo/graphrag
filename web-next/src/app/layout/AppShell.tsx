import { NavLink, Outlet, useLocation } from "react-router-dom";

import { navSections, type NavGlyph } from "./nav";

function resolveCurrentLabel(pathname: string) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return item.label;
      }
    }
  }

  return "概览";
}

function renderNavIcon(icon: NavGlyph) {
  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="2" y="2" width="4" height="4" rx="1" />
          <rect x="10" y="2" width="4" height="4" rx="1" />
          <rect x="2" y="10" width="4" height="4" rx="1" />
          <rect x="10" y="10" width="4" height="4" rx="1" />
        </svg>
      );
    case "graphs":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <path d="M5.2 7.2 10.8 4.8M5.2 8.8l5.6 2.4" />
        </svg>
      );
    case "viz":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <path d="M5.2 4.4 10.8 4.8M4.8 5.2l2.4 5.4M11.2 6.2 8.8 10.8" />
        </svg>
      );
    case "sources":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <ellipse cx="8" cy="4" rx="4.5" ry="2" />
          <path d="M3.5 4v4c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V4" />
          <path d="M3.5 8v4c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V8" />
        </svg>
      );
    case "query":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
      );
    case "browse":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <path d="M5.2 4h5.6M4.8 5.2l2.4 5.6M11.2 5.2 8.8 10.8" />
        </svg>
      );
    case "jobs":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 11h2l2-6 3 8 2-5h3" />
        </svg>
      );
    case "dify":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6.5 8.8 3 12 4.8 7.2 8.3 4 6.5Z" />
          <path d="M5.2 8.2v3.2L8.4 13l2.4-1.4" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.8v2.1M8 12.1v2.1M3.6 3.6l1.5 1.5M10.9 10.9l1.5 1.5M1.8 8h2.1M12.1 8h2.1M3.6 12.4l1.5-1.5M10.9 5.1l1.5-1.5" />
        </svg>
      );
  }
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="5" height="10" rx="1" />
      <rect x="9" y="3" width="5" height="10" rx="1" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5a3 3 0 0 0-3 3v1.2c0 .7-.2 1.5-.7 2.1l-1 1.4h9.4l-1-1.4c-.5-.6-.7-1.4-.7-2.1V5.5a3 3 0 0 0-3-3Z" />
      <path d="M6.4 12.2a1.8 1.8 0 0 0 3.2 0" />
    </svg>
  );
}

export function AppShell() {
  const location = useLocation();
  const currentLabel = resolveCurrentLabel(location.pathname);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand-block">
          <div className="brand-graph-icon" aria-hidden="true">
            <span className="brand-graph-connector brand-graph-connector-one" />
            <span className="brand-graph-connector brand-graph-connector-two" />
            <span className="brand-graph-node brand-graph-node-top" />
            <span className="brand-graph-node brand-graph-node-left" />
            <span className="brand-graph-node brand-graph-node-right" />
          </div>
          <div>
            <div className="sidebar-brand">GraphRAG</div>
            <div className="sidebar-subtitle">Admin Console</div>
          </div>
        </div>

        <button type="button" className="workspace-switch">
          <span className="workspace-mark">M</span>
          <span>microsoft-research</span>
          <span className="workspace-caret">⌄</span>
        </button>

        {navSections.map((section) => (
          <div key={section.id} className="nav-section">
            {section.label ? (
              <div className="sidebar-section-label">{section.label}</div>
            ) : null}
            <nav className="sidebar-nav">
              {section.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    isActive ? "nav-link nav-link-active" : "nav-link"
                  }
                >
                  <span className="nav-link-copy">
                    <span className="nav-icon">{renderNavIcon(item.icon)}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.count ? (
                    <span className="nav-count-badge">{item.count}</span>
                  ) : null}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="avatar-pill">晨</div>
          <div className="user-meta">
            <strong>陈晨</strong>
            <span>chen.chen@ms.com</span>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="top-header">
          <div className="top-header-copy">
            <span className="top-header-section">工作区</span>
            <span className="breadcrumb-separator">›</span>
            <strong>{currentLabel}</strong>
          </div>

          <div className="top-header-actions">
            <div className="top-search">
              <label className="searchbar">
                <span className="searchbar__icon">
                  <SearchIcon />
                </span>
                <input
                  className="ui-input searchbar-input"
                  type="text"
                  readOnly
                  aria-label="搜索图谱、实体、任务"
                  placeholder="搜索图谱、实体、任务..."
                />
                <span className="kbd">⌘K</span>
              </label>
            </div>

            <button type="button" className="icon-chip" aria-label="布局切换">
              <LayoutIcon />
            </button>
            <button type="button" className="icon-chip icon-chip-notice" aria-label="提醒">
              <BellIcon />
              <span className="notification-dot" />
            </button>
            <button type="button" className="toolbar-primary-button">
              <span className="toolbar-plus">+</span>
              <span>新建图谱</span>
            </button>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
