import { Card, Collapse, Empty, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";

import { getGraphs, queryGraph } from "../api/client";
import { QueryPanel } from "../components/QueryPanel";
import { getQueryContextLabel } from "../content/workbench";
import type { GraphSummary, QueryRequest, QueryResponsePayload } from "../types";

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

export function QueryPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [result, setResult] = useState<QueryResponsePayload | null>(null);

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
      setResult(null);
      const response = await queryGraph(payload);
      setResult(response);
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

  const contextEntries = result ? Object.entries(result.context) : [];

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
      </div>

      <div className="analysis-layout analysis-layout--query">
        <QueryPanel graphs={graphs} loading={queryLoading || loading} onSubmit={handleSubmit} />

        <div className="analysis-query-results">
          <Card className="surface-card answer-card analysis-card analysis-query-result" title="回答">
            {result ? (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Typography.Text className="muted-text">
                    图谱 {result.graph_id} · 模式 {result.mode}
                  </Typography.Text>
                  <Typography.Paragraph className="answer-text">
                    {renderAnswer(result.answer)}
                  </Typography.Paragraph>
                </div>
              </Space>
            ) : (
              <Empty description="请先在左侧输入问题并发起查询" />
            )}
          </Card>

          <Card className="surface-card analysis-card analysis-query-context" title="上下文">
            {result ? (
              <Collapse
                items={contextEntries.map(([key, value]) => ({
                  key,
                  label: getQueryContextLabel(key),
                  children: renderContextValue(value),
                }))}
              />
            ) : (
              <Empty description="查询完成后，这里会显示检索上下文" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
