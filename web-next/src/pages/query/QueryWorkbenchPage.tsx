import { useEffect, useState } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import { QueryComposer } from "../../features/graph-query/QueryComposer";
import { QueryResultPanel } from "../../features/graph-query/QueryResultPanel";
import type { QueryMode, QueryResponsePayload } from "../../shared/types/api";
import { PageHeader } from "../../shared/ui/PageHeader";

const availableModes = ["global", "local", "drift"] as const;
const fallbackRecentQueries = [
  "特斯拉与英伟达的关系是什么？",
  "医疗文献中常见的副作用类型",
  "Microsoft 近三年的主要收购",
];

export function QueryWorkbenchPage() {
  const { queryRepository } = useRepositories();
  const [graphId] = useState("demo-001");
  const [graphLabel] = useState("金融年报 2024 · v3");
  const [mode, setMode] = useState<QueryMode>(availableModes[0]);
  const [question, setQuestion] = useState(
    "2024 年 AI 领域最重要的三个技术突破是什么？",
  );
  const [result, setResult] = useState<QueryResponsePayload | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [communityLevel, setCommunityLevel] = useState("0（叶子）");
  const [responseType, setResponseType] = useState("multi-paragraph");
  const [maxContextTokens, setMaxContextTokens] = useState("12000");
  const [temperature, setTemperature] = useState("0.0");
  const [enableCitations, setEnableCitations] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);

  async function handleRun(nextMode = mode) {
    setIsRunning(true);

    try {
      const payload = await queryRepository.runSampleQuery(graphId, nextMode);
      setResult(payload);
    } finally {
      setIsRunning(false);
    }
  }

  function handleModeChange(nextMode: QueryMode) {
    setMode(nextMode);
  }

  useEffect(() => {
    void handleRun("global");
  }, []);

  return (
    <>
      <PageHeader
        title="查询测试台"
        description="在发布到 Dify 之前，直接测试 GraphRAG 的三种检索模式。"
      />
      <section className="query-workbench-grid">
        <div className="query-main-stack">
          <QueryComposer
            graphId={graphId}
            graphLabel={graphLabel}
            mode={mode}
            question={question}
            recentQueries={result?.recent_queries ?? fallbackRecentQueries}
            isRunning={isRunning}
            onModeChange={handleModeChange}
            onQuestionChange={setQuestion}
            onRun={() => void handleRun()}
          />
          <QueryResultPanel result={result} />
        </div>

        <aside className="ui-card query-settings-card">
          <div className="query-settings-section">
            <h2>参数</h2>
          </div>

          <div className="query-settings-stack">
            <label className="query-setting-field">
              <span className="query-field-label">Community Level</span>
              <select
                className="query-select"
                value={communityLevel}
                onChange={(event) => setCommunityLevel(event.target.value)}
              >
                <option>0（叶子）</option>
                <option>1（社区）</option>
                <option>2（聚合）</option>
              </select>
            </label>

            <label className="query-setting-field">
              <span className="query-field-label">Response Type</span>
              <select
                className="query-select"
                value={responseType}
                onChange={(event) => setResponseType(event.target.value)}
              >
                <option>multi-paragraph</option>
                <option>bullet-list</option>
                <option>precise</option>
              </select>
            </label>

            <label className="query-setting-field">
              <span className="query-field-label">Max Context Tokens</span>
              <input
                type="number"
                className="ui-input query-setting-input"
                value={maxContextTokens}
                onChange={(event) => setMaxContextTokens(event.target.value)}
              />
            </label>

            <label className="query-setting-field">
              <span className="query-field-label">Temperature</span>
              <input
                type="number"
                step="0.1"
                className="ui-input query-setting-input"
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
              />
            </label>

            <div className="query-toggle-row">
              <span className="query-field-label">启用引用</span>
              <button
                type="button"
                className={
                  enableCitations
                    ? "query-toggle-button query-toggle-button-on"
                    : "query-toggle-button"
                }
                onClick={() => setEnableCitations((value) => !value)}
              >
                <span className="query-toggle-thumb" />
              </button>
            </div>

            <div className="query-toggle-row">
              <span className="query-field-label">流式响应</span>
              <button
                type="button"
                className={
                  streamResponse
                    ? "query-toggle-button query-toggle-button-on"
                    : "query-toggle-button"
                }
                onClick={() => setStreamResponse((value) => !value)}
              >
                <span className="query-toggle-thumb" />
              </button>
            </div>
          </div>

          <div className="query-settings-divider" />

          <div className="query-settings-section">
            <h3>最近查询</h3>
            <div className="query-recent-list">
              {(result?.recent_queries ?? fallbackRecentQueries).map((item) => (
                <button key={item} type="button" className="query-recent-item">
                  <span className="query-recent-icon">
                    <HistoryIcon />
                  </span>
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 12a7.25 7.25 0 1 0 2.2-5.2" />
      <path d="M4.75 4.75v4.5h4.5" />
      <path d="M12 8.25v4.25l2.75 1.75" />
    </svg>
  );
}
