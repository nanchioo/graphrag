import { useEffect, useState } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import { QueryComposer } from "../../features/graph-query/QueryComposer";
import { QueryResultPanel } from "../../features/graph-query/QueryResultPanel";
import type {
  GraphSummary,
  QueryMode,
  QueryResponsePayload,
} from "../../shared/types/api";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PageHeader } from "../../shared/ui/PageHeader";

const availableModes = ["global", "local", "drift"] as const;

const communityLevelOptions = [
  { label: "0（叶子）", value: 0 },
  { label: "1（社区）", value: 1 },
  { label: "2（聚合）", value: 2 },
] as const;

const responseTypeOptions = [
  { label: "multi-paragraph", value: "Multiple Paragraphs" },
  { label: "bullet-list", value: "Bulleted List" },
  { label: "precise", value: "Single Sentence" },
] as const;

const preferredGraphStorageKey = "graphrag:selected-graph";

export function QueryWorkbenchPage() {
  const { graphRepository, queryRepository } = useRepositories();
  const [graphOptions, setGraphOptions] = useState<GraphSummary[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState("");
  const [mode, setMode] = useState<QueryMode>(availableModes[0]);
  const [question, setQuestion] = useState(
    "2024 年 AI 领域最重要的三个技术突破是什么？",
  );
  const [result, setResult] = useState<QueryResponsePayload | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [communityLevel, setCommunityLevel] = useState("2");
  const [responseType, setResponseType] = useState("Multiple Paragraphs");
  const [maxContextTokens, setMaxContextTokens] = useState("12000");
  const [temperature, setTemperature] = useState("0.0");
  const [enableCitations, setEnableCitations] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);

  useEffect(() => {
    let alive = true;

    void graphRepository.listGraphs().then((items) => {
      if (!alive) {
        return;
      }

      const preferredGraphId =
        typeof window === "undefined"
          ? null
          : window.sessionStorage.getItem(preferredGraphStorageKey);
      const nextSelectedGraphId =
        preferredGraphId && items.some((item) => item.id === preferredGraphId)
          ? preferredGraphId
          : items[0]?.id || "";

      setGraphOptions(items);
      setSelectedGraphId((current) => {
        if (current && items.some((item) => item.id === current)) {
          return current;
        }

        return nextSelectedGraphId;
      });

      if (preferredGraphId && typeof window !== "undefined") {
        window.sessionStorage.removeItem(preferredGraphStorageKey);
      }
    });

    return () => {
      alive = false;
    };
  }, [graphRepository]);

  async function handleRun(nextMode = mode) {
    if (!selectedGraphId) {
      return;
    }

    setIsRunning(true);

    try {
      const payload = await queryRepository.runQuery({
        graph_id: selectedGraphId,
        question,
        mode: nextMode,
        community_level: Number(communityLevel),
        response_type: responseType,
        dynamic_community_selection: nextMode === "global",
      });
      setResult(payload);
    } finally {
      setIsRunning(false);
    }
  }

  function handleModeChange(nextMode: QueryMode) {
    setMode(nextMode);
  }

  useEffect(() => {
    if (!selectedGraphId) {
      setResult(null);
      return;
    }

    void handleRun("global");
  }, [selectedGraphId]);

  if (graphOptions.length === 0) {
    return (
      <>
        <PageHeader
          title="查询测试台"
          description="在发布到 Dify 之前，直接测试 GraphRAG 的三种检索模式。"
        />
        <EmptyState
          title="暂无可查询图谱"
          description="先到图谱管理页创建图谱、上传文件并完成构建，再回来运行查询。"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="查询测试台"
        description="在发布到 Dify 之前，直接测试 GraphRAG 的三种检索模式。"
      />
      <section className="query-workbench-grid">
        <div className="query-main-stack">
          <QueryComposer
            graphOptions={graphOptions}
            graphId={selectedGraphId}
            mode={mode as "global" | "local" | "drift"}
            question={question}
            recentQueries={result?.recent_queries ?? []}
            isRunning={isRunning}
            onGraphChange={setSelectedGraphId}
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
                {communityLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="query-setting-field">
              <span className="query-field-label">Response Type</span>
              <select
                className="query-select"
                value={responseType}
                onChange={(event) => setResponseType(event.target.value)}
              >
                {responseTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
              {(result?.recent_queries ?? []).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="query-recent-item"
                  onClick={() => setQuestion(item)}
                >
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
