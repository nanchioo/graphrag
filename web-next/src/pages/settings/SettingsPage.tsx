import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import type { SystemConfigPayload } from "../../shared/types/api";
import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";

const fallbackConfig: SystemConfigPayload = {
  projects_root: "D:/Software/Project/graphrag/data/projects",
  upload_root: "D:/Software/Project/graphrag/data/uploads",
  default_model_profile_id: "graphrag-prod",
  llm_provider: "Azure OpenAI",
  llm_model: "gpt-4.1",
  api_base: "https://your.openai.azure.com",
  deployment: "gpt-4-1106",
  api_version: "2024-02-15-preview",
  concurrency: 16,
  rate_limit_per_minute: 500,
  max_retries: 5,
  enable_llm_cache: true,
};

const settingsSections = [
  { id: "llm", label: "LLM 配置", glyph: "AI" },
  { id: "vector", label: "向量库", glyph: "DB" },
  { id: "users", label: "用户与权限", glyph: "U" },
  { id: "keys", label: "API Keys", glyph: "K" },
  { id: "webhook", label: "Webhook", glyph: "W" },
  { id: "logs", label: "日志", glyph: "L" },
] as const;

type SettingsSectionId = (typeof settingsSections)[number]["id"];

const vectorStores = [
  {
    name: "graphrag-prod",
    engine: "LanceDB",
    dimension: "1536",
    vectors: "4.82M",
    status: "正常",
    tone: "success",
    isDefault: true,
  },
  {
    name: "graphrag-staging",
    engine: "Qdrant",
    dimension: "1536",
    vectors: "1.12M",
    status: "正常",
    tone: "success",
    isDefault: false,
  },
  {
    name: "legal-contracts",
    engine: "Azure AI Search",
    dimension: "3072",
    vectors: "820K",
    status: "配额告警",
    tone: "pending",
    isDefault: false,
  },
] as const;

const members = [
  {
    name: "陈晨",
    email: "chen.chen@ms.com",
    initials: "晨",
    avatarTone: "orange",
    role: "Owner",
    roleTone: "owner",
    activeAt: "刚刚",
  },
  {
    name: "李明",
    email: "li.ming@ms.com",
    initials: "李",
    avatarTone: "indigo",
    role: "Admin",
    roleTone: "admin",
    activeAt: "12 分钟前",
  },
  {
    name: "王芳",
    email: "wang.fang@ms.com",
    initials: "王",
    avatarTone: "pink",
    role: "Editor",
    roleTone: "editor",
    activeAt: "3 小时前",
  },
  {
    name: "Zhang Wei",
    email: "zhang.wei@ms.com",
    initials: "Z",
    avatarTone: "green",
    role: "Viewer",
    roleTone: "viewer",
    activeAt: "昨天",
  },
  {
    name: "Sarah Kim",
    email: "sarah.kim@ms.com",
    initials: "S",
    avatarTone: "cyan",
    role: "Editor",
    roleTone: "editor",
    activeAt: "3 天前",
  },
] as const;

const permissionMatrix = [
  { label: "查询图谱", owner: true, admin: true, editor: true, viewer: true },
  { label: "创建 / 编辑图谱", owner: true, admin: true, editor: true, viewer: false },
  { label: "启动索引任务", owner: true, admin: true, editor: true, viewer: false },
  { label: "管理数据源", owner: true, admin: true, editor: false, viewer: false },
  { label: "管理成员与角色", owner: true, admin: true, editor: false, viewer: false },
] as const;

const apiKeys = [
  {
    name: "生产 · Dify 集成",
    key: "sk_gra_live_8f2a••••••••",
    scope: "read, query",
    createdAt: "2024-11-12",
    lastUsedAt: "2 分钟前",
  },
  {
    name: "生产 · 内部微服务",
    key: "sk_gra_live_c1d4••••••••",
    scope: "read, query, write",
    createdAt: "2024-09-20",
    lastUsedAt: "1 小时前",
  },
  {
    name: "开发 · 本地测试",
    key: "sk_gra_dev_7b9e••••••••",
    scope: "read, query",
    createdAt: "2025-01-05",
    lastUsedAt: "昨天",
  },
] as const;

const webhookEndpoints = [
  {
    url: "https://hooks.dify.your-company.com/ingest",
    events: ["job.completed", "job.failed"],
    delivery: "2 分钟前 · 200",
    status: "健康",
    tone: "success",
  },
  {
    url: "https://alerts.ops.your-company.com/graphrag",
    events: ["job.failed", "quota.warning"],
    delivery: "1 小时前 · 200",
    status: "健康",
    tone: "success",
  },
  {
    url: "https://legacy-erp.your-company.com/graphrag",
    events: ["graph.updated"],
    delivery: "5 小时前 · 500",
    status: "失败",
    tone: "failed",
  },
] as const;

const webhookEvents = [
  ["job.started", "索引任务开始"],
  ["job.completed", "索引任务成功完成"],
  ["job.failed", "索引任务失败"],
  ["graph.updated", "图谱被更新"],
  ["quota.warning", "Token 配额告警"],
  ["source.synced", "数据源完成同步"],
] as const;

const logEntries = [
  ["14:32:08", "INFO", "[indexer]  Started job_8f2a1c on graph 金融年报 2024"],
  ["14:32:11", "INFO", "[llm]      LLM request -> gpt-4.1 · prompt_tokens=1834"],
  ["14:33:02", "WARN", "[llm]      Rate limit 429 · retry_after=12s · attempt 1/5"],
  ["14:33:15", "INFO", "[llm]      Retry succeeded · prompt_tokens=1834 completion_tokens=612"],
  ["14:41:55", "INFO", "[indexer]  Stage: EmbedChunks · 28/42 batches (66.7%)"],
  ["14:52:03", "ERROR", "[indexer]  job_3b48ee failed: missing API key for provider openai"],
  ["14:53:18", "INFO", "[query]    Local search · graph=金融年报 2024 · top_k=10 · 412ms"],
  ["14:54:02", "INFO", "[webhook]  Delivered job.completed -> hooks.dify.your-company.com · 200"],
] as const;

export function SettingsPage() {
  const { settingsRepository } = useRepositories();
  const [config, setConfig] = useState<SystemConfigPayload | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("llm");

  useEffect(() => {
    let alive = true;

    void settingsRepository.getSystemConfig().then((payload) => {
      if (alive) {
        setConfig(payload);
      }
    });

    return () => {
      alive = false;
    };
  }, [settingsRepository]);

  const displayConfig = config ?? fallbackConfig;

  return (
    <div className="settings-workspace">
      <PageHeader
        title="系统设置"
        description="集中管理默认模型、向量库、团队权限、API 凭据以及系统运行日志。"
      />

      <div className="settings-console-grid">
        <aside className="settings-side-nav">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={
                activeSection === section.id
                  ? "settings-nav-item settings-nav-item-active"
                  : "settings-nav-item"
              }
              onClick={() => setActiveSection(section.id)}
            >
              <span className="settings-nav-glyph">{section.glyph}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </aside>

        <div className="settings-main-stack">
          {activeSection === "llm" ? <LlmSection config={displayConfig} /> : null}
          {activeSection === "vector" ? <VectorSection /> : null}
          {activeSection === "users" ? <UsersSection /> : null}
          {activeSection === "keys" ? <ApiKeysSection /> : null}
          {activeSection === "webhook" ? <WebhookSection /> : null}
          {activeSection === "logs" ? <LogsSection /> : null}
        </div>
      </div>
    </div>
  );
}

function LlmSection({ config }: { config: SystemConfigPayload }) {
  return (
    <>
      <SettingsPanel
        title="默认 LLM (用于实体抽取 & 社区摘要)"
        footer={
          <>
            <button type="button" className="settings-text-button">
              恢复默认
            </button>
            <Button type="button" className="button-primary">
              保存
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <label className="settings-field">
            <span>Provider</span>
            <select className="ui-input settings-select" defaultValue={config.llm_provider ?? "Azure OpenAI"}>
              <option>Azure OpenAI</option>
              <option>OpenAI</option>
              <option>Ollama</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Model</span>
            <select className="ui-input settings-select" defaultValue={config.llm_model ?? "gpt-4.1"}>
              <option>gpt-4.1</option>
              <option>gpt-4o</option>
              <option>deepseek-chat</option>
            </select>
          </label>
          <label className="settings-field">
            <span>API Base</span>
            <input
              type="text"
              className="ui-input"
              defaultValue={config.api_base ?? "https://your.openai.azure.com"}
            />
            <small className="settings-field-help">Azure 需要完整 URL</small>
          </label>
          <label className="settings-field">
            <span>Deployment</span>
            <input
              type="text"
              className="ui-input"
              defaultValue={config.deployment ?? "gpt-4-1106"}
            />
          </label>
          <label className="settings-field">
            <span>API Version</span>
            <input
              type="text"
              className="ui-input"
              defaultValue={config.api_version ?? "2024-02-15-preview"}
            />
          </label>
          <label className="settings-field">
            <span>并发数</span>
            <input
              type="number"
              className="ui-input"
              defaultValue={config.concurrency ?? 16}
            />
          </label>
          <label className="settings-field settings-field-span">
            <span>API Key</span>
            <input
              type="password"
              className="ui-input"
              defaultValue="sk_live_7ae9d9e1b5f2134"
            />
          </label>
        </div>
      </SettingsPanel>

      <SettingsPanel title="速率限制与重试">
        <div className="form-grid">
          <label className="settings-field">
            <span>每分钟最大请求</span>
            <input
              type="number"
              className="ui-input"
              defaultValue={config.rate_limit_per_minute ?? 500}
            />
          </label>
          <label className="settings-field">
            <span>最大重试次数</span>
            <input
              type="number"
              className="ui-input"
              defaultValue={config.max_retries ?? 5}
            />
          </label>
        </div>

        <div className="query-toggle-row settings-toggle-row">
          <div className="settings-toggle-copy">
            <strong>启用 LLM 缓存</strong>
            <span>相同输入返回缓存结果，避免重复调用</span>
          </div>
          <button
            type="button"
            className={
              config.enable_llm_cache
                ? "query-toggle-button query-toggle-button-on"
                : "query-toggle-button"
            }
          >
            <span className="query-toggle-thumb" />
          </button>
        </div>
      </SettingsPanel>
    </>
  );
}

function VectorSection() {
  return (
    <>
      <SettingsPanel
        title="向量库实例"
        actions={
          <Button type="button" className="button-primary">
            + 新建向量库
          </Button>
        }
      >
        <div className="graph-table-shell settings-vector-table">
          <table className="graph-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>引擎</th>
                <th>维度</th>
                <th>向量数</th>
                <th>状态</th>
                <th>默认</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vectorStores.map((store) => (
                <tr key={store.name}>
                  <td className="settings-strong-cell">{store.name}</td>
                  <td>
                    <span className="settings-engine-pill">{store.engine}</span>
                  </td>
                  <td>{store.dimension}</td>
                  <td>{store.vectors}</td>
                  <td>
                    <span className={`status-pill ${store.tone}`}>
                      <span className="status-dot" />
                      {store.status}
                    </span>
                  </td>
                  <td>
                    {store.isDefault ? (
                      <span className="status-pill running">
                        <span className="status-dot" />
                        默认
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <div className="settings-action-group">
                      <button type="button" className="settings-icon-button" aria-label="配置向量库">
                        配
                      </button>
                      <button type="button" className="settings-icon-button" aria-label="删除向量库">
                        删
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsPanel>

      <SettingsPanel title="默认 Embedding 模型">
        <div className="form-grid">
          <label className="settings-field">
            <span>Provider</span>
            <select className="ui-input settings-select" defaultValue="Azure OpenAI">
              <option>Azure OpenAI</option>
              <option>OpenAI</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Model</span>
            <select className="ui-input settings-select" defaultValue="text-embedding-3-small">
              <option>text-embedding-3-small</option>
              <option>text-embedding-3-large</option>
            </select>
          </label>
          <label className="settings-field">
            <span>批量大小</span>
            <input type="number" className="ui-input" defaultValue={64} />
          </label>
          <label className="settings-field">
            <span>分片长度</span>
            <input type="number" className="ui-input" defaultValue={8192} />
            <small className="settings-field-help">超过该长度将截断</small>
          </label>
        </div>
      </SettingsPanel>
    </>
  );
}

function UsersSection() {
  return (
    <>
      <SettingsPanel
        title="成员 (5)"
        actions={
          <div className="settings-toolbar">
            <input type="search" className="ui-input settings-search-input" placeholder="搜索成员..." />
            <Button type="button" className="button-primary">
              + 邀请成员
            </Button>
          </div>
        }
      >
        <div className="graph-table-shell settings-user-table">
          <table className="graph-table">
            <thead>
              <tr>
                <th>成员</th>
                <th>角色</th>
                <th>最近活跃</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.email}>
                  <td>
                    <div className="settings-user-member">
                      <span className={`settings-user-avatar ${member.avatarTone}`}>{member.initials}</span>
                      <div className="stack-xs">
                        <strong>{member.name}</strong>
                        <span className="table-secondary">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`settings-role-badge ${member.roleTone}`}>{member.role}</span>
                  </td>
                  <td>{member.activeAt}</td>
                  <td>
                    <button type="button" className="settings-icon-button" aria-label="成员更多操作">
                      ...
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsPanel>

      <SettingsPanel title="角色权限矩阵">
        <div className="graph-table-shell settings-permission-table">
          <table className="graph-table">
            <thead>
              <tr>
                <th>权限</th>
                <th>Owner</th>
                <th>Admin</th>
                <th>Editor</th>
                <th>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{item.owner ? "✓" : "—"}</td>
                  <td>{item.admin ? "✓" : "—"}</td>
                  <td>{item.editor ? "✓" : "—"}</td>
                  <td>{item.viewer ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsPanel>
    </>
  );
}

function ApiKeysSection() {
  return (
    <>
      <section className="settings-api-warning">
        <div className="settings-warning-icon">!</div>
        <div className="stack-xs">
          <strong>API Key 仅在创建时完整显示一次</strong>
          <span>创建后仅可查看 Key 前缀，请妥善保管或重新生成。</span>
        </div>
      </section>

      <SettingsPanel
        title="API Keys"
        actions={
          <Button type="button" className="button-primary">
            + 生成新 Key
          </Button>
        }
      >
        <div className="graph-table-shell settings-api-table">
          <table className="graph-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>Key</th>
                <th>权限</th>
                <th>创建时间</th>
                <th>最近使用</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.name}>
                  <td className="settings-strong-cell">{key.name}</td>
                  <td className="settings-mono-cell">{key.key}</td>
                  <td>{key.scope}</td>
                  <td>{key.createdAt}</td>
                  <td>{key.lastUsedAt}</td>
                  <td>
                    <div className="settings-action-group">
                      <button type="button" className="settings-icon-button" aria-label="复制 Key">
                        复
                      </button>
                      <button type="button" className="settings-icon-button" aria-label="轮换 Key">
                        换
                      </button>
                      <button type="button" className="settings-icon-button" aria-label="删除 Key">
                        删
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsPanel>
    </>
  );
}

function WebhookSection() {
  return (
    <>
      <SettingsPanel
        title="Webhook 端点"
        actions={
          <Button type="button" className="button-primary">
            + 添加端点
          </Button>
        }
      >
        <div className="graph-table-shell settings-webhook-table">
          <table className="graph-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>事件</th>
                <th>最近投递</th>
                <th>状态</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {webhookEndpoints.map((item) => (
                <tr key={item.url}>
                  <td className="settings-mono-cell">{item.url}</td>
                  <td>
                    <div className="settings-chip-row">
                      {item.events.map((event) => (
                        <span key={event} className="settings-event-chip">
                          {event}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{item.delivery}</td>
                  <td>
                    <span className={`status-pill ${item.tone}`}>
                      <span className="status-dot" />
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="settings-action-group">
                      <button type="button" className="settings-icon-button" aria-label="测试 Webhook">
                        测
                      </button>
                      <button type="button" className="settings-icon-button" aria-label="配置 Webhook">
                        配
                      </button>
                      <button type="button" className="settings-icon-button" aria-label="删除 Webhook">
                        删
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsPanel>

      <SettingsPanel title="可订阅事件">
        <div className="settings-webhook-events">
          {webhookEvents.map(([event, description]) => (
            <article key={event} className="settings-event-card">
              <span className="settings-event-tag">{event}</span>
              <span>{description}</span>
            </article>
          ))}
        </div>
      </SettingsPanel>
    </>
  );
}

function LogsSection() {
  return (
    <SettingsPanel
      title="日志"
      actions={
        <div className="settings-toolbar">
          <select className="ui-input settings-select settings-toolbar-select" defaultValue="all-levels">
            <option value="all-levels">全部级别</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
          <select className="ui-input settings-select settings-toolbar-select" defaultValue="all-modules">
            <option value="all-modules">全部模块</option>
            <option value="indexer">indexer</option>
            <option value="llm">llm</option>
            <option value="webhook">webhook</option>
          </select>
          <select className="ui-input settings-select settings-toolbar-select" defaultValue="recent-hour">
            <option value="recent-hour">最近 1 小时</option>
            <option value="recent-day">最近 24 小时</option>
          </select>
          <input type="search" className="ui-input settings-search-input" placeholder="搜索日志..." />
          <button type="button" className="graph-header-button">
            导出
          </button>
        </div>
      }
    >
      <div className="settings-log-console">
        {logEntries.map(([time, level, message]) => (
          <div key={`${time}-${message}`} className="settings-log-line">
            <span className="settings-log-time">{time}</span>
            <span className={`settings-log-level ${level.toLowerCase()}`}>{level}</span>
            <span className="settings-log-message">{message}</span>
          </div>
        ))}
      </div>
    </SettingsPanel>
  );
}

function SettingsPanel({
  title,
  actions,
  footer,
  children,
}: PropsWithChildren<{
  title: string;
  actions?: ReactNode;
  footer?: ReactNode;
}>) {
  return (
    <section className="ui-card settings-panel-card">
      <div className="settings-panel-header">
        <h2>{title}</h2>
        {actions ? <div className="settings-panel-actions">{actions}</div> : null}
      </div>
      <div className="settings-panel-body">{children}</div>
      {footer ? <div className="settings-panel-footer">{footer}</div> : null}
    </section>
  );
}
