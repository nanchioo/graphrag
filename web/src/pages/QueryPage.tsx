import { Button, Card, Collapse, Empty, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getGraphs, queryGraph } from "../api/client";
import { QueryPanel } from "../components/QueryPanel";
import { getQueryContextLabel } from "../content/workbench";
import type { GraphSummary, QueryRequest, QueryResponsePayload } from "../types";

interface QueryConversationItem {
  id: string;
  request: QueryRequest;
  response: QueryResponsePayload;
  createdAt: string;
}

function renderAnswer(answer: QueryResponsePayload["answer"]) {
  if (typeof answer === "string") {
    return answer;
  }

  return JSON.stringify(answer, null, 2);
}

function renderContextValue(value: unknown) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography.Text className="muted-text">暂无内容</Typography.Text>;
    }

    return (
      <div className="context-grid">
        {value.map((item, index) => (
          <div className="context-item" key={index}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {JSON.stringify(item, null, 2)}
            </Typography.Paragraph>
          </div>
        ))}
      </div>
    );
  }

  if (value !== null && typeof value === "object") {
    return (
      <Typography.Paragraph
        style={{ marginBottom: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {JSON.stringify(value, null, 2)}
      </Typography.Paragraph>
    );
  }

  return (
    <Typography.Paragraph style={{ marginBottom: 0 }}>
      {String(value)}
    </Typography.Paragraph>
  );
}

function createConversationId() {
  return `query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatConversationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function getGraphName(graphs: GraphSummary[], graphId: string) {
  return graphs.find((graph) => graph.id === graphId)?.name ?? graphId;
}

export function QueryPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams] = useSearchParams();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [conversations, setConversations] = useState<QueryConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  async function loadGraphs() {
    try {
      setLoading(true);
      const payload = await getGraphs();
      setGraphs(payload.items);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(payload: QueryRequest) {
    try {
      setQueryLoading(true);
      const response = await queryGraph(payload);
      const nextConversation = {
        id: createConversationId(),
        request: payload,
        response,
        createdAt: formatConversationTime(),
      };

      setConversations((current) => [...current, nextConversation]);
      setActiveConversationId(nextConversation.id);
      messageApi.success("查询完成");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "查询失败");
    } finally {
      setQueryLoading(false);
    }
  }

  useEffect(() => {
    void loadGraphs();
  }, []);

  const initialGraphId = searchParams.get("graph_id");
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    conversations[conversations.length - 1] ??
    null;
  const contextEntries = activeConversation
    ? Object.entries(activeConversation.response.context)
    : [];

  return (
    <div className="page-stack analysis-page analysis-page--query">
      {contextHolder}
      <div className="page-hero analysis-hero">
        <div>
          <Typography.Title level={3}>问答工作台</Typography.Title>
          <Typography.Paragraph className="muted-text">
            选择目标图谱和查询模式，直接调用 GraphRAG 的 local、global、basic、drift 查询能力。
          </Typography.Paragraph>
        </div>
        <div className="analysis-hero-meta">
          <span className="analysis-chip analysis-chip--accent">
            {conversations.length} rounds
          </span>
          <Button
            disabled={conversations.length === 0}
            onClick={() => {
              setConversations([]);
              setActiveConversationId(null);
            }}
          >
            清空当前会话
          </Button>
        </div>
      </div>

      <div className="analysis-layout analysis-layout--query">
        <QueryPanel
          graphs={graphs}
          loading={queryLoading || loading}
          initialGraphId={initialGraphId}
          onSubmit={handleSubmit}
        />

        <div className="analysis-query-results">
          <Card
            className="surface-card answer-card analysis-card analysis-query-result query-chat-card"
            title="对话"
          >
            {conversations.length > 0 ? (
              <div className="query-chat-thread" aria-live="polite">
                {conversations.map((conversation) => {
                  const selected = conversation.id === activeConversation?.id;

                  return (
                    <article
                      role="button"
                      tabIndex={0}
                      className={`query-chat-exchange${selected ? " active" : ""}`}
                      key={conversation.id}
                      onClick={() => setActiveConversationId(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveConversationId(conversation.id);
                        }
                      }}
                    >
                      <div className="query-chat-meta">
                        <span>{getGraphName(graphs, conversation.response.graph_id)}</span>
                        <span>{conversation.response.mode}</span>
                        <span>{conversation.createdAt}</span>
                      </div>
                      <div className="query-chat-message query-chat-message--user">
                        <Typography.Paragraph>
                          {conversation.request.question}
                        </Typography.Paragraph>
                      </div>
                      <div className="query-chat-message query-chat-message--assistant">
                        <Typography.Paragraph className="answer-text">
                          {renderAnswer(conversation.response.answer)}
                        </Typography.Paragraph>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty description="请先在左侧输入问题并发起查询。" />
            )}
          </Card>

          <Card
            className="surface-card analysis-card analysis-query-context query-context-card"
            title="检索上下文"
            extra={
              activeConversation ? (
                <Tag color="blue">
                  {getGraphName(graphs, activeConversation.response.graph_id)}
                </Tag>
              ) : null
            }
          >
            {activeConversation && contextEntries.length > 0 ? (
              <Collapse
                items={contextEntries.map(([key, value]) => ({
                  key,
                  label: getQueryContextLabel(key),
                  children: renderContextValue(value),
                }))}
              />
            ) : activeConversation ? (
              <Empty description="当前回答没有返回检索上下文。" />
            ) : (
              <Empty description="选择一条回答后，这里会显示检索上下文。" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
