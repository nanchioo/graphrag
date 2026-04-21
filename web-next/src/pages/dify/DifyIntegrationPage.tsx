import { useState } from "react";

import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";

type MappingItem = {
  graph: string;
  dataset: string;
  mode: "Global Search" | "Local Search" | "Drift Search";
  sync: string;
  enabled: boolean;
};

const initialMappings: MappingItem[] = [
  {
    graph: "金融年报 2024",
    dataset: "finance-qa-kb",
    mode: "Global Search",
    sync: "自动（每小时）",
    enabled: true,
  },
  {
    graph: "医疗文献 Q2",
    dataset: "medical-research",
    mode: "Local Search",
    sync: "手动",
    enabled: true,
  },
  {
    graph: "客服对话数据",
    dataset: "support-agent",
    mode: "Drift Search",
    sync: "自动（每小时）",
    enabled: false,
  },
];

const recentCalls = [
  { title: "2024 年英伟达的主要竞争对手", latency: "3.2s", time: "12s 前", tone: "success" },
  { title: "特斯拉 FSD 的技术路线演进", latency: "4.1s", time: "48s 前", tone: "success" },
  { title: "GraphRAG 如何处理增量更新", latency: "2.8s", time: "2m 前", tone: "success" },
  { title: "医疗领域的主要风险事件", latency: "超时", time: "5m 前", tone: "failed" },
] as const;

export function DifyIntegrationPage() {
  const [mappings, setMappings] = useState(initialMappings);

  return (
    <div className="dify-page-shell">
      <div className="dify-page-header">
        <PageHeader
          title="Dify 对接配置"
          description="将 GraphRAG 图谱作为知识库接入 Dify 应用。"
        />

        <div className="dify-page-actions">
          <button type="button" className="graph-header-button">
            <BookIcon />
            对接文档
          </button>
          <Button type="button" className="button-primary dify-save-button">
            <SaveIcon />
            保存配置
          </Button>
        </div>
      </div>

      <section className="dify-connection-banner">
        <span className="dify-banner-icon">
          <CheckCircleIcon />
        </span>
        <div>
          <strong>连接成功</strong>
          <p>最后测试于 2 分钟前 · 响应 142ms · Dify v0.15.2</p>
        </div>
      </section>

      <div className="dify-console-grid">
        <div className="dify-main-stack">
          <section className="ui-card dify-connection-card">
            <div className="dify-card-header">
              <h2>基础连接</h2>
              <span className="dify-status-badge">已连接</span>
            </div>

            <div className="dify-form-grid">
              <label className="dify-field dify-field-full">
                <span className="dify-field-label">Dify Endpoint *</span>
                <div className="dify-input-shell">
                  <span className="dify-input-icon">
                    <LinkIcon />
                  </span>
                  <input
                    type="text"
                    className="ui-input dify-input"
                    defaultValue="https://dify.your-company.com/v1"
                  />
                </div>
                <span className="dify-field-help">Dify 实例地址（自托管或云）</span>
              </label>

              <label className="dify-field">
                <span className="dify-field-label">API Key *</span>
                <div className="dify-input-shell">
                  <span className="dify-input-icon">
                    <KeyIcon />
                  </span>
                  <input
                    type="password"
                    className="ui-input dify-input"
                    defaultValue="sk_9f8c4e6db0fa7b313"
                  />
                  <button type="button" className="dify-trailing-button" aria-label="显示 API Key">
                    <EyeIcon />
                  </button>
                </div>
                <span className="dify-field-help">在 Dify 的「设置 → API 访问」中创建</span>
              </label>

              <label className="dify-field">
                <span className="dify-field-label">Workspace ID</span>
                <input
                  type="text"
                  className="ui-input dify-input"
                  defaultValue="ws_4f92a1e6"
                />
              </label>
            </div>

            <div className="dify-action-row">
              <button type="button" className="graph-header-button">
                <FlaskIcon />
                测试连接
              </button>
            </div>
          </section>

          <section className="ui-card dify-mapping-card">
            <div className="dify-card-header">
              <h2>知识库映射</h2>
              <button type="button" className="graph-header-button">
                <PlusIcon />
                新增映射
              </button>
            </div>

            <div className="dify-mapping-table">
              <table className="graph-table">
                <thead>
                  <tr>
                    <th>GraphRAG 图谱</th>
                    <th>Dify Dataset</th>
                    <th>检索模式</th>
                    <th>同步</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((item, index) => (
                    <tr key={item.graph}>
                      <td>
                        <div className="dify-graph-cell">
                          <span className="dify-graph-icon">
                            <GraphIcon />
                          </span>
                          <strong>{item.graph}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="dify-dataset-cell">
                          <span className="dify-arrow">
                            <ArrowRightIcon />
                          </span>
                          <span className="dify-dataset-name">{item.dataset}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`dify-mode-badge ${
                            item.mode === "Global Search"
                              ? "brand"
                              : item.mode === "Local Search"
                                ? "info"
                                : "warning"
                          }`}
                        >
                          {item.mode}
                        </span>
                      </td>
                      <td>
                        <div className="dify-sync-cell">
                          <span>{item.sync}</span>
                          <button
                            type="button"
                            className={
                              item.enabled
                                ? "dify-switch dify-switch-on"
                                : "dify-switch"
                            }
                            onClick={() =>
                              setMappings((current) =>
                                current.map((mapping, mappingIndex) =>
                                  mappingIndex === index
                                    ? { ...mapping, enabled: !mapping.enabled }
                                    : mapping,
                                ),
                              )
                            }
                          >
                            <span className="dify-switch-thumb" />
                          </button>
                        </div>
                      </td>
                      <td>
                        <button type="button" className="dify-row-menu" aria-label="映射更多操作">
                          <MoreIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="dify-side-stack">
          <section className="ui-card dify-instance-card">
            <div className="dify-instance-top">
              <span className="dify-instance-logo">D</span>
              <div>
                <h2>Dify Self-Hosted</h2>
                <p>v0.15.2 · Docker</p>
              </div>
            </div>

            <div className="dify-instance-stats">
              <div className="dify-instance-row">
                <span>状态</span>
                <strong className="dify-inline-status">在线</strong>
              </div>
              <div className="dify-instance-row">
                <span>已同步图谱</span>
                <strong>3 / 12</strong>
              </div>
              <div className="dify-instance-row">
                <span>今日调用</span>
                <strong>1,482</strong>
              </div>
              <div className="dify-instance-row">
                <span>平均响应</span>
                <strong>3.41s</strong>
              </div>
              <div className="dify-instance-row">
                <span>成功率</span>
                <strong className="dify-success-text">99.4%</strong>
              </div>
            </div>
          </section>

          <section className="ui-card dify-call-card">
            <h2>最近 Dify 调用</h2>
            <div className="dify-call-list">
              {recentCalls.map((call) => (
                <article key={call.title} className="dify-call-item">
                  <div className="dify-call-header">
                    <strong>{call.title}</strong>
                    <span
                      className={
                        call.tone === "failed"
                          ? "dify-call-latency failed"
                          : "dify-call-latency"
                      }
                    >
                      {call.latency}
                    </span>
                  </div>
                  <span className="dify-call-time">{call.time}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 5.25h10.75A1.5 1.5 0 0 1 18.75 6.75v10.5a1.5 1.5 0 0 0-1.5-1.5H6.5A2.25 2.25 0 0 0 4.25 18V7.5A2.25 2.25 0 0 1 6.5 5.25Z" />
      <path d="M18.75 17.25V6.75A1.5 1.5 0 0 0 17.25 5.25H6.5" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.75 5.75A1.5 1.5 0 0 1 7.25 4.25h8.62l2.88 2.88V18.75a1.5 1.5 0 0 1-1.5 1.5H7.25a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M8.25 4.25v5.5h7.5v-4" />
      <path d="M8.75 20.25v-5.5h6.5v5.5" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.25 13.75 8 16a3.18 3.18 0 1 1-4.5-4.5l2.75-2.75a3.18 3.18 0 0 1 4.5 0" />
      <path d="m13.75 10.25 2.25-2.25a3.18 3.18 0 0 1 4.5 4.5l-2.75 2.75a3.18 3.18 0 0 1-4.5 0" />
      <path d="m8.75 15.25 6.5-6.5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="12" r="3.25" />
      <path d="M11.25 12h8" />
      <path d="M16.25 12v2.5" />
      <path d="M18.75 12v2.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.75 12s3.4-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.4 5.5-9.25 5.5S2.75 12 2.75 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3.75h4" />
      <path d="M11 3.75v5.75l-4.75 7.2A2 2 0 0 0 7.92 19.75h8.16a2 2 0 0 0 1.67-3.05L13 9.5V3.75" />
      <path d="M8.75 14.25h6.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5.75v12.5" />
      <path d="M5.75 12h12.5" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="12" r="2" />
      <circle cx="16.5" cy="6.5" r="2" />
      <circle cx="16.5" cy="17.5" r="2" />
      <path d="M8.25 11.2 14.75 7.3" />
      <path d="m8.25 12.8 6.5 3.9" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.75 12h12.5" />
      <path d="m14.75 8.75 3.25 3.25-3.25 3.25" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17.5" cy="12" r="1.5" />
    </svg>
  );
}
