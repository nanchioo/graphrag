import {
  mockDashboardMetricCards,
  mockDifyStatus,
  mockEntityGrowthPeriods,
  mockEntityGrowthPoints,
  mockQuickActions,
  mockRecentDifyCalls,
  mockRecentJobs,
  mockRecentQueries,
  mockTaskOverview,
  mockTokenBars,
  mockTokenSummary,
} from "../../mocks/fixtures/dashboard";
import { PageHeader } from "../../shared/ui/PageHeader";

function buildSparklinePath(points: number[]) {
  const width = 680;
  const height = 220;
  const step = width / Math.max(points.length - 1, 1);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);

  const coordinates = points.map((point, index) => {
    const x = index * step;
    const y = height - ((point - min) / range) * 120 - 36;
    return `${x},${y}`;
  });

  const line = coordinates.join(" ");
  const area = [`0,${height}`, ...coordinates, `${width},${height}`].join(" ");

  return { line, area };
}

function statusClassName(status: string) {
  if (status === "完成") {
    return "success";
  }

  if (status === "运行中") {
    return "running";
  }

  return "failed";
}

export function DashboardPage() {
  const sparkline = buildSparklinePath(mockEntityGrowthPoints);
  const sparklinePoints = sparkline.line.split(" ");
  const lastPoint = sparklinePoints[sparklinePoints.length - 1]?.split(",") ?? [];

  return (
    <>
      <PageHeader
        title="概览"
        description="查看图谱总体状态、最近索引任务和资源消耗。"
      />

      <section className="dashboard-kpi-grid">
        {mockDashboardMetricCards.map((card) => (
          <article
            key={card.label}
            className={`ui-card dashboard-kpi-card tone-${card.tone}`}
          >
            <div className="dashboard-kpi-label">{card.label}</div>
            <div className="dashboard-kpi-value-row">
              <strong className="dashboard-kpi-value">{card.value}</strong>
              {card.suffix ? (
                <span className="dashboard-kpi-suffix">{card.suffix}</span>
              ) : null}
            </div>
            <div
              className={`dashboard-kpi-trend ${card.tone === "success" ? "muted" : "positive"}`}
            >
              {card.trendLabel}
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-insights-grid">
        <section className="ui-card chart-shell chart-shell-wide">
          <div className="chart-header">
            <div>
              <h3>实体增长</h3>
              <p>过去 14 天</p>
            </div>
            <div className="chart-period-tabs">
              {mockEntityGrowthPeriods.map((period) => (
                <button
                  key={period}
                  type="button"
                  className={
                    period === "14天" ? "period-tab period-tab-active" : "period-tab"
                  }
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="line-chart-panel">
            <svg viewBox="0 0 680 220" className="sparkline-chart" aria-hidden="true">
              <defs>
                <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(37,99,235,0.24)" />
                  <stop offset="100%" stopColor="rgba(37,99,235,0.04)" />
                </linearGradient>
              </defs>
              <polygon points={sparkline.area} fill="url(#growthFill)" />
              <polyline points={sparkline.line} fill="none" stroke="#2563eb" strokeWidth="3" />
              {lastPoint.length === 2 ? (
                <circle
                  cx={lastPoint[0]}
                  cy={lastPoint[1]}
                  r="4.5"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="3"
                />
              ) : null}
            </svg>
          </div>
        </section>

        <section className="ui-card chart-shell">
          <div className="chart-header">
            <div>
              <h3>Token 消耗（日）</h3>
            </div>
            <div className="realtime-badge">实时</div>
          </div>
          <div className="bar-chart-panel">
            <div className="bar-chart">
              {mockTokenBars.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className="bar-chart-column"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
            <div className="token-summary">
              <div className="token-summary-row">
                <span>今日</span>
                <strong>{mockTokenSummary.todayLabel}</strong>
              </div>
              <div className="token-summary-row">
                <span>费用</span>
                <strong>{mockTokenSummary.costLabel}</strong>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="dashboard-bottom-grid">
        <section className="ui-card recent-task-card">
          <div className="chart-header">
            <div>
              <h3>最近任务</h3>
            </div>
            <button type="button" className="table-link">
              查看全部
            </button>
          </div>
          <div className="table-shell recent-task-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>图谱</th>
                  <th>阶段</th>
                  <th>进度</th>
                  <th>耗时</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentJobs.map((job) => (
                  <tr key={`${job.graph}-${job.stage}`}>
                    <td>{job.graph}</td>
                    <td>{job.stage}</td>
                    <td>
                      <div className="task-progress-cell">
                        <div className="task-progress-track">
                          <div
                            className="task-progress-fill"
                            style={{ width: `${job.progressValue}%` }}
                          />
                        </div>
                        <span>{job.progress}</span>
                      </div>
                    </td>
                    <td>{job.duration}</td>
                    <td>
                      <span className={`status-pill ${statusClassName(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="dashboard-side-stack">
          <section className="ui-card status-card">
            <div className="chart-header">
              <div>
                <h3>Dify 对接状态</h3>
                <p>{mockDifyStatus.description}</p>
              </div>
              <span className="status-pill success">{mockDifyStatus.label}</span>
            </div>
            <div className="inline-actions">
              <button type="button" className="secondary-button">
                重新同步
              </button>
              <button type="button" className="text-button">
                配置
              </button>
            </div>
          </section>

          <section className="ui-card quick-action-card">
            <div className="chart-header">
              <div>
                <h3>快捷操作</h3>
              </div>
            </div>
            <div className="quick-action-list">
              {mockQuickActions.map((action) => (
                <button key={action} type="button" className="quick-action-row">
                  <span>{action}</span>
                  <span>›</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="dashboard-footer-grid">
        <section className="ui-card footer-list-card">
          <div className="chart-header">
            <div>
              <h3>最近查询</h3>
              <p>继续常用问题，快速回到测试台。</p>
            </div>
          </div>
          <div className="dashboard-mini-list">
            {mockRecentQueries.map((query) => (
              <button key={query} type="button" className="dashboard-mini-row">
                <span>{query}</span>
                <span>›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="ui-card footer-list-card">
          <div className="chart-header">
            <div>
              <h3>最近 Dify 调用</h3>
              <p>查看最新接入请求的响应状态。</p>
            </div>
          </div>
          <div className="dashboard-mini-list">
            {mockRecentDifyCalls.map((item) => (
              <div key={item.title} className="dashboard-mini-row dashboard-mini-row-static">
                <div className="dashboard-call-copy">
                  <span>{item.title}</span>
                  <small>{item.time}</small>
                </div>
                <span
                  className={`status-pill ${item.status === "超时" ? "failed" : "success"}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-card footer-summary-card">
          <div className="chart-header">
            <div>
              <h3>任务概况</h3>
              <p>用更紧凑的方式看当前工作台负载。</p>
            </div>
          </div>
          <div className="footer-summary-grid">
            {mockTaskOverview.map((item) => (
              <article key={item.label} className="summary-kpi">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
