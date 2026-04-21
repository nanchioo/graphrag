import { useState } from "react";

import { PageHeader } from "../../shared/ui/PageHeader";

type BrowseTab = "entities" | "relations" | "communities";

const browseTabs = [
  { id: "entities", label: "实体", count: "48,291" },
  { id: "relations", label: "关系", count: "132,904" },
  { id: "communities", label: "社区", count: "142" },
] as const;

const entities = [
  {
    name: "英伟达",
    type: "ORGANIZATION",
    tone: "violet",
    degree: 184,
    community: "C-12 · AI 科技巨头",
    sourceDocs: 42,
  },
  {
    name: "黄仁勋",
    type: "PERSON",
    tone: "blue",
    degree: 87,
    community: "C-12 · AI 科技巨头",
    sourceDocs: 28,
  },
  {
    name: "H100 芯片",
    type: "CONCEPT",
    tone: "green",
    degree: 52,
    community: "C-12 · AI 科技巨头",
    sourceDocs: 19,
  },
  {
    name: "CUDA",
    type: "CONCEPT",
    tone: "green",
    degree: 43,
    community: "C-12 · AI 科技巨头",
    sourceDocs: 15,
  },
  {
    name: "特斯拉",
    type: "ORGANIZATION",
    tone: "violet",
    degree: 156,
    community: "C-7 · 新能源",
    sourceDocs: 38,
  },
  {
    name: "Dojo 超算",
    type: "CONCEPT",
    tone: "green",
    degree: 28,
    community: "C-7 · 新能源",
    sourceDocs: 11,
  },
  {
    name: "美联储加息",
    type: "EVENT",
    tone: "rose",
    degree: 94,
    community: "C-3 · 宏观",
    sourceDocs: 52,
  },
  {
    name: "Anthropic",
    type: "ORGANIZATION",
    tone: "violet",
    degree: 61,
    community: "C-12 · AI 科技巨头",
    sourceDocs: 18,
  },
];

const relations = [
  {
    subject: "英伟达",
    predicate: "竞争关系",
    object: "AMD",
    confidence: 0.92,
    tone: "success",
    evidence: 8,
  },
  {
    subject: "黄仁勋",
    predicate: "创立",
    object: "英伟达",
    confidence: 0.99,
    tone: "success",
    evidence: 12,
  },
  {
    subject: "特斯拉",
    predicate: "使用",
    object: "Dojo 超算",
    confidence: 0.88,
    tone: "brand",
    evidence: 6,
  },
  {
    subject: "Anthropic",
    predicate: "发布",
    object: "Claude 3.5",
    confidence: 0.97,
    tone: "success",
    evidence: 14,
  },
  {
    subject: "美联储",
    predicate: "影响",
    object: "纳斯达克",
    confidence: 0.71,
    tone: "warning",
    evidence: 24,
  },
];

const communities = [
  {
    name: "AI 科技巨头",
    level: "L0",
    id: "C-12",
    entityCount: 64,
    relationCount: 184,
    tone: "blue",
  },
  {
    name: "新能源产业链",
    level: "L0",
    id: "C-7",
    entityCount: 42,
    relationCount: 118,
    tone: "orange",
  },
  {
    name: "宏观金融",
    level: "L0",
    id: "C-3",
    entityCount: 58,
    relationCount: 201,
    tone: "indigo",
  },
  {
    name: "医药研发",
    level: "L1",
    id: "C-23",
    entityCount: 89,
    relationCount: 246,
    tone: "green",
  },
  {
    name: "客户服务",
    level: "L1",
    id: "C-31",
    entityCount: 31,
    relationCount: 74,
    tone: "cyan",
  },
  {
    name: "监管与合规",
    level: "L2",
    id: "C-42",
    entityCount: 27,
    relationCount: 58,
    tone: "pink",
  },
];

export function EntityBrowserPage() {
  const [activeTab, setActiveTab] = useState<BrowseTab>("entities");

  const searchPlaceholder =
    activeTab === "entities" ? "按名称搜索实体..." : "搜索...";

  return (
    <>
      <PageHeader
        title="实体 / 关系"
        description="浏览图谱中的实体与关系，支持跨图谱筛选。"
      />

      <div className="browse-workspace">
        <div className="browse-tab-nav" role="tablist" aria-label="浏览模式">
          {browseTabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={
                  isActive
                    ? "browse-tab-button browse-tab-button-active"
                    : "browse-tab-button"
                }
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="browse-tab-icon">
                  {tab.id === "entities" ? <EntityIcon /> : null}
                  {tab.id === "relations" ? <RelationIcon /> : null}
                  {tab.id === "communities" ? <CommunityIcon /> : null}
                </span>
                <span>{tab.label}</span>
                <span className="browse-tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="browse-toolbar">
          <div className="browse-toolbar-left">
            <label className="browse-search">
              <span className="browse-search-icon">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="ui-input browse-search-input"
                placeholder={searchPlaceholder}
              />
            </label>

            <select className="browse-select" defaultValue="all-type" aria-label="类型">
              <option value="all-type">全部类型</option>
              <option value="organization">组织</option>
              <option value="person">人物</option>
              <option value="concept">概念</option>
            </select>

            <select className="browse-select" defaultValue="all-community" aria-label="社区">
              <option value="all-community">全部社区</option>
              <option value="c12">C-12 · AI 科技巨头</option>
              <option value="c7">C-7 · 新能源</option>
              <option value="c3">C-3 · 宏观</option>
            </select>
          </div>

          <button type="button" className="graph-header-button">
            <ExportIcon />
            导出 CSV
          </button>
        </div>

        {activeTab === "entities" ? <EntitiesView /> : null}
        {activeTab === "relations" ? <RelationsView /> : null}
        {activeTab === "communities" ? <CommunitiesView /> : null}
      </div>
    </>
  );
}

function EntitiesView() {
  const maxDegree = Math.max(...entities.map((item) => item.degree));

  return (
    <div className="graph-table-shell browse-table-shell">
      <table className="graph-table browse-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>度数</th>
            <th>社区</th>
            <th>来源文档</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entities.map((item) => (
            <tr key={item.name}>
              <td className="browse-strong-cell">{item.name}</td>
              <td>
                <span className={`browse-type-badge ${item.tone}`}>{item.type}</span>
              </td>
              <td>
                <div className="browse-metric-cell">
                  <strong>{item.degree}</strong>
                  <div className="browse-progress-track">
                    <span
                      className="browse-progress-fill brand"
                      style={{ width: `${(item.degree / maxDegree) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td>{item.community}</td>
              <td>{item.sourceDocs}</td>
              <td>
                <button type="button" className="browse-icon-button" aria-label="打开实体详情">
                  <OpenIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelationsView() {
  return (
    <div className="graph-table-shell browse-table-shell">
      <table className="graph-table browse-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Predicate</th>
            <th>Object</th>
            <th>置信度</th>
            <th>证据</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {relations.map((item) => (
            <tr key={`${item.subject}-${item.predicate}-${item.object}`}>
              <td className="browse-strong-cell">{item.subject}</td>
              <td className="browse-link-text">{item.predicate}</td>
              <td className="browse-strong-cell">{item.object}</td>
              <td>
                <div className="browse-metric-cell">
                  <strong>{item.confidence.toFixed(2)}</strong>
                  <div className="browse-progress-track">
                    <span
                      className={`browse-progress-fill ${item.tone}`}
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td>{item.evidence} 处</td>
              <td>
                <button type="button" className="browse-icon-button" aria-label="打开关系详情">
                  <OpenIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommunitiesView() {
  return (
    <div className="browse-community-grid">
      {communities.map((item) => (
        <article key={item.id} className={`browse-community-card ${item.tone}`}>
          <div className="browse-community-top">
            <h3>{item.name}</h3>
            <span className="browse-community-level">{item.level}</span>
          </div>

          <div className="browse-community-stats">
            <div>
              <span>实体</span>
              <strong>{item.entityCount}</strong>
            </div>
            <div>
              <span>关系</span>
              <strong>{item.relationCount}</strong>
            </div>
            <div>
              <span>ID</span>
              <strong>{item.id}</strong>
            </div>
          </div>

          <p className="browse-community-summary">
            社区摘要报告：由 LLM 基于成员实体和关系生成，用于 Global Search 的上下文。
          </p>

          <div className="browse-community-actions">
            <button type="button" className="browse-text-action">
              <ReportIcon />
              查看报告
            </button>
            <button type="button" className="browse-text-action">
              <RelationIcon />
              可视化
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EntityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6.25" />
      <circle cx="12" cy="12" r="1.75" />
    </svg>
  );
}

function RelationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="7" r="2.25" />
      <circle cx="17" cy="7" r="2.25" />
      <circle cx="12" cy="17" r="2.25" />
      <path d="M8.75 8.5 10.6 15" />
      <path d="m15.25 8.5-1.85 6.5" />
      <path d="M9.25 7h5.5" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.75 18.25 8 12 11.25 5.75 8 12 4.75Z" />
      <path d="M5.75 12 12 15.25 18.25 12" />
      <path d="M5.75 16 12 19.25 18.25 16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16 3.75 3.75" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.75v9.5" />
      <path d="m8.75 11 3.25 3.25L15.25 11" />
      <path d="M5.75 18.25h12.5" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.75 5.75h4.5v4.5" />
      <path d="M10 14 18.25 5.75" />
      <path d="M18.25 13.25V18a1.25 1.25 0 0 1-1.25 1.25H6A1.25 1.25 0 0 1 4.75 18V7A1.25 1.25 0 0 1 6 5.75h4.75" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.75h7l4.25 4.25V20a1.25 1.25 0 0 1-1.25 1.25h-10.5A1.25 1.25 0 0 1 5.25 20V5A1.25 1.25 0 0 1 6.5 3.75Z" />
      <path d="M14 3.75V8h4.25" />
      <path d="M8.75 11.25h6.5" />
      <path d="M8.75 15h5" />
    </svg>
  );
}
