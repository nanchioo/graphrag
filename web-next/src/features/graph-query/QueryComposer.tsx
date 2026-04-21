import type { GraphSummary } from "../../shared/types/api";
import { Button } from "../../shared/ui/Button";

type QueryComposerProps = {
  graphOptions: GraphSummary[];
  graphId: string;
  mode: "global" | "local" | "drift";
  question: string;
  recentQueries: string[];
  isRunning: boolean;
  onGraphChange: (graphId: string) => void;
  onModeChange: (mode: "global" | "local" | "drift") => void;
  onQuestionChange: (question: string) => void;
  onRun: () => void;
};

const modeCopy = {
  global: {
    title: "Global Search",
    description: "基于社区报告的全局回答",
  },
  local: {
    title: "Local Search",
    description: "聚焦实体邻域的精准问答",
  },
  drift: {
    title: "Drift Search",
    description: "混合式，从局部漂移到全局",
  },
} as const;

export function QueryComposer({
  graphOptions,
  graphId,
  mode,
  question,
  recentQueries,
  isRunning,
  onGraphChange,
  onModeChange,
  onQuestionChange,
  onRun,
}: QueryComposerProps) {
  return (
    <section className="ui-card query-composer-card">
      <div className="query-mode-grid">
        {(["global", "local", "drift"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={
              item === mode
                ? "query-mode-card query-mode-card-active"
                : "query-mode-card"
            }
            onClick={() => onModeChange(item)}
          >
            <strong>{modeCopy[item].title}</strong>
            <span>{modeCopy[item].description}</span>
          </button>
        ))}
      </div>

      <div className="query-form-stack">
        <label className="query-field">
          <span className="query-field-label">图谱</span>
          <select
            className="query-select"
            value={graphId}
            aria-label="图谱选择"
            onChange={(event) => onGraphChange(event.target.value)}
          >
            {graphOptions.map((graph) => (
              <option key={graph.id} value={graph.id}>
                {graph.name}
              </option>
            ))}
          </select>
        </label>

        <label className="query-field">
          <span className="query-field-label">问题</span>
          <textarea
            className="ui-input ui-textarea query-question-input"
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
          />
        </label>
      </div>

      <p className="query-helper-copy">
        Global 适合主题型概括，Local 适合具体实体问答。最近查询与参数设置在右侧面板查看，
        当前共准备了 {recentQueries.length} 条最近查询样例。
      </p>

      <div className="query-composer-footer">
        <div className="query-estimate-row">
          <span className="query-estimate-icon">
            <SparkIcon />
          </span>
          <span className="query-estimate-label">估算</span>
          <strong>~18K</strong>
          <span>tokens</span>
          <span>·</span>
          <strong>$0.14</strong>
        </div>

        <div className="query-footer-actions">
          <button type="button" className="query-text-button">
            <TuneIcon />
            高级参数
          </button>
          <Button
            type="button"
            className="button-primary query-run-button"
            onClick={onRun}
            disabled={isRunning}
          >
            <PlayIcon />
            {isRunning ? "查询中..." : "运行查询"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.75 13.88 8l4.37.34-3.32 2.86 1 4.3L12 13.4l-3.93 2.1 1-4.3-3.32-2.86L10.12 8 12 3.75Z" />
    </svg>
  );
}

function TuneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.75 7.5h12.5" />
      <path d="M5.75 16.5h12.5" />
      <circle cx="9" cy="7.5" r="2.25" />
      <circle cx="15" cy="16.5" r="2.25" />
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
