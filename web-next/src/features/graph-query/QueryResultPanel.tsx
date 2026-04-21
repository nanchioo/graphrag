import { useState } from "react";

import type { QueryResponsePayload } from "../../shared/types/api";

function readArrayField(value: Record<string, unknown>, key: string): string[] {
  const entry = value[key];

  if (!Array.isArray(entry)) {
    return [];
  }

  return entry.filter((item): item is string => typeof item === "string");
}

type ResultTab = "context" | "communities" | "chain";

export function QueryResultPanel({
  result,
}: {
  result: QueryResponsePayload | null;
}) {
  const [activeTab, setActiveTab] = useState<ResultTab>("context");

  if (!result) {
    return (
      <section className="ui-card query-result-card">
        <div className="query-result-empty">
          <strong>尚未执行查询</strong>
          <p>输入问题并点击“运行查询”后，这里会展示回答、检索上下文和执行链路。</p>
        </div>
      </section>
    );
  }

  const communities = readArrayField(result.context, "communities");
  const references = readArrayField(result.context, "references");
  const executionChain = result.execution_chain ?? [];
  const paragraphs = result.answer.split("\n\n");

  return (
    <section className="ui-card query-result-card">
      <div className="query-result-header">
        <div className="query-result-title">
          <h2>回答</h2>
          <span className="query-result-badge">
            {result.response_type ?? "Query Result"}
          </span>
        </div>

        <div className="query-result-meta">
          <span>
            响应 {result.latency_label ?? "—"} · {result.token_count_label ?? "—"}
          </span>
          <div className="query-result-actions">
            <button type="button" className="query-icon-button" aria-label="复制回答">
              <CopyIcon />
            </button>
            <button type="button" className="query-icon-button" aria-label="点赞">
              <ThumbUpIcon />
            </button>
            <button type="button" className="query-icon-button" aria-label="点踩">
              <ThumbDownIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="query-answer-body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="answer-block">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="query-result-tabs">
        <button
          type="button"
          className={
            activeTab === "context"
              ? "query-result-tab query-result-tab-active"
              : "query-result-tab"
          }
          onClick={() => setActiveTab("context")}
        >
          检索上下文 {result.hit_context_count ?? 0}
        </button>
        <button
          type="button"
          className={
            activeTab === "communities"
              ? "query-result-tab query-result-tab-active"
              : "query-result-tab"
          }
          onClick={() => setActiveTab("communities")}
        >
          命中社区 {result.hit_community_count ?? 0}
        </button>
        <button
          type="button"
          className={
            activeTab === "chain"
              ? "query-result-tab query-result-tab-active"
              : "query-result-tab"
          }
          onClick={() => setActiveTab("chain")}
        >
          执行链路
        </button>
      </div>

      <div className="query-result-detail">
        {activeTab === "context" ? (
          <div className="query-reference-list">
            {references.map((reference) => (
              <span key={reference} className="query-reference-chip">
                {reference}
              </span>
            ))}
          </div>
        ) : null}

        {activeTab === "communities" ? (
          <div className="query-reference-list">
            {communities.map((community) => (
              <span key={community} className="query-reference-chip">
                {community}
              </span>
            ))}
          </div>
        ) : null}

        {activeTab === "chain" ? (
          <div className="query-chain-list">
            {executionChain.map((item, index) => (
              <div key={item} className="query-chain-step">
                <span className="query-chain-index">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.75 9.75h8.5A1.5 1.5 0 0 1 19.75 11.25v8.5a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M6.75 14.25h-.5a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 1.5-1.5h8.5a1.5 1.5 0 0 1 1.5 1.5v.5" />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.75 10.25 12.5 4.75c.27-.55.92-.86 1.52-.72.61.14 1.03.67 1.03 1.29v3.93h2.79a1.9 1.9 0 0 1 1.88 2.2l-.77 5a1.9 1.9 0 0 1-1.88 1.6H9.75" />
      <path d="M4.75 9.75h5v8.5h-5z" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.25 13.75 11.5 19.25c-.27.55-.92.86-1.52.72-.61-.14-1.03-.67-1.03-1.29v-3.93H6.16a1.9 1.9 0 0 1-1.88-2.2l.77-5a1.9 1.9 0 0 1 1.88-1.6h7.32" />
      <path d="M14.25 5.75h5v8.5h-5z" />
    </svg>
  );
}
