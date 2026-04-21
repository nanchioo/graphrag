import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";

type JobAction = "view" | "pause" | "retry";

const kpis = [
  {
    label: "运行中",
    value: "3",
    subtext: "— 2 个排队",
    tone: "neutral",
  },
  {
    label: "今日完成",
    value: "12",
    subtext: "↗ +4 vs 昨天",
    tone: "success",
  },
  {
    label: "失败",
    value: "1",
    subtext: "↘ 上次 · 5 小时前",
    tone: "danger",
  },
  {
    label: "平均耗时",
    value: "18:42",
    subtext: "↗ -12%",
    tone: "success",
  },
] as const;

const jobs = [
  {
    id: "job_8f2a1c",
    graph: "金融年报 2024",
    type: "Standard Index",
    typeTone: "brand",
    stage: "GenerateReports",
    progress: 82,
    progressTone: "brand",
    tokens: "1.24M",
    duration: "12m 04s",
    status: "运行中",
    statusTone: "running",
    actions: ["view", "pause"] as JobAction[],
  },
  {
    id: "job_7d14e9",
    graph: "法律合同库",
    type: "Standard Index",
    typeTone: "brand",
    stage: "EmbedChunks",
    progress: 45,
    progressTone: "brand",
    tokens: "820K",
    duration: "8m 50s",
    status: "运行中",
    statusTone: "running",
    actions: ["view", "pause"] as JobAction[],
  },
  {
    id: "job_6a02b5",
    graph: "新闻舆情",
    type: "Incremental",
    typeTone: "warning",
    stage: "EmbedReports",
    progress: 92,
    progressTone: "brand",
    tokens: "420K",
    duration: "4m 12s",
    status: "运行中",
    statusTone: "running",
    actions: ["view", "pause"] as JobAction[],
  },
  {
    id: "job_5e91d0",
    graph: "医疗文献 Q2",
    type: "Standard Index",
    typeTone: "brand",
    stage: "—",
    progress: 100,
    progressTone: "brand",
    tokens: "3.82M",
    duration: "41m 22s",
    status: "完成",
    statusTone: "success",
    actions: ["view"] as JobAction[],
  },
  {
    id: "job_4c7fa2",
    graph: "客服对话数据",
    type: "FastGraphRAG",
    typeTone: "info",
    stage: "—",
    progress: 100,
    progressTone: "brand",
    tokens: "180K",
    duration: "2m 18s",
    status: "完成",
    statusTone: "success",
    actions: ["view"] as JobAction[],
  },
  {
    id: "job_3b48ee",
    graph: "产品手册 v3",
    type: "Standard Index",
    typeTone: "brand",
    stage: "ExtractGraph",
    progress: 32,
    progressTone: "warning",
    tokens: "108K",
    duration: "5m 01s",
    status: "失败",
    statusTone: "failed",
    actions: ["view", "retry"] as JobAction[],
  },
] as const;

export function JobMonitorPage() {
  return (
    <div className="jobs-page-shell">
      <div className="jobs-page-header">
        <PageHeader
          title="任务监控"
          description="索引任务的实时状态与历史记录。"
        />

        <div className="jobs-page-actions">
          <button type="button" className="graph-header-button">
            <RefreshIcon />
            刷新
          </button>
          <Button type="button" className="button-primary jobs-start-button">
            <PlayIcon />
            启动新任务
          </Button>
        </div>
      </div>

      <section className="jobs-kpi-grid">
        {kpis.map((item) => (
          <article key={item.label} className="ui-card jobs-kpi-card">
            <div className="jobs-kpi-label-row">
              <span className="jobs-kpi-icon">
                {item.label === "运行中" ? <SpinnerIcon /> : null}
                {item.label === "今日完成" ? <CheckCircleIcon /> : null}
                {item.label === "失败" ? <CloseCircleIcon /> : null}
                {item.label === "平均耗时" ? <TimerIcon /> : null}
              </span>
              <span>{item.label}</span>
            </div>
            <strong className="jobs-kpi-value">{item.value}</strong>
            <span className={`jobs-kpi-trend ${item.tone}`}>{item.subtext}</span>
          </article>
        ))}
      </section>

      <section className="ui-card jobs-table-card">
        <div className="jobs-table-header">
          <h2>任务列表</h2>
          <div className="jobs-filter-group">
            <select className="jobs-filter-select" defaultValue="all-status">
              <option value="all-status">全部状态</option>
              <option value="running">运行中</option>
              <option value="success">完成</option>
              <option value="failed">失败</option>
            </select>
            <select className="jobs-filter-select" defaultValue="all-graphs">
              <option value="all-graphs">所有图谱</option>
              <option value="finance">金融年报 2024</option>
              <option value="contracts">法律合同库</option>
              <option value="news">新闻舆情</option>
            </select>
          </div>
        </div>

        <div className="graph-table-shell jobs-table-shell">
          <table className="graph-table jobs-table">
            <thead>
              <tr>
                <th>任务 ID</th>
                <th>图谱</th>
                <th>类型</th>
                <th>当前阶段</th>
                <th>进度</th>
                <th>Token</th>
                <th>耗时</th>
                <th>状态</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="jobs-mono-cell">{job.id}</td>
                  <td className="jobs-strong-cell">{job.graph}</td>
                  <td>
                    <span className={`jobs-type-pill ${job.typeTone}`}>{job.type}</span>
                  </td>
                  <td className="jobs-mono-cell jobs-stage-cell">{job.stage}</td>
                  <td>
                    <div className="jobs-progress-cell">
                      <div className="jobs-progress-track">
                        <span
                          className={`jobs-progress-fill ${job.progressTone}`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span>{job.progress}%</span>
                    </div>
                  </td>
                  <td>{job.tokens}</td>
                  <td>{job.duration}</td>
                  <td>
                    <span className={`jobs-status-pill ${job.statusTone}`}>
                      <span className="status-dot" />
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <div className="jobs-action-group">
                      {job.actions.includes("view") ? (
                        <button type="button" className="job-action-button" aria-label="查看任务">
                          <EyeIcon />
                        </button>
                      ) : null}
                      {job.actions.includes("pause") ? (
                        <button type="button" className="job-action-button" aria-label="暂停任务">
                          <PauseIcon />
                        </button>
                      ) : null}
                      {job.actions.includes("retry") ? (
                        <button type="button" className="job-action-button" aria-label="重试任务">
                          <RetryIcon />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 7.5V4.75h-2.75" />
      <path d="M18.25 11a6.25 6.25 0 1 0 1.1 3.56" />
      <path d="M19 4.75 15.5 8.25" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8.25 6.75 9 5.25-9 5.25V6.75Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.75a7.25 7.25 0 1 0 7.25 7.25" />
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

function CloseCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" />
      <path d="m9.75 9.75 4.5 4.5" />
      <path d="m14.25 9.75-4.5 4.5" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6.25v6l3.25 1.75" />
      <circle cx="12" cy="13" r="6.25" />
      <path d="M9.5 3.75h5" />
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

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.75 6.25v11.5" />
      <path d="M15.25 6.25v11.5" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 7.5V4.75h-2.75" />
      <path d="M18.25 11a6.25 6.25 0 1 0 1.1 3.56" />
      <path d="M19 4.75 15.5 8.25" />
    </svg>
  );
}
