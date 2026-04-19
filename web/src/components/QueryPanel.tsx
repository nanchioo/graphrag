import { Button, Card, Form, Input, InputNumber, Select, Space } from "antd";
import { useEffect } from "react";

import type { GraphSummary, QueryRequest } from "../types";

interface QueryPanelProps {
  graphs: GraphSummary[];
  loading?: boolean;
  onSubmit: (payload: QueryRequest) => Promise<void> | void;
}

export function QueryPanel({ graphs, loading = false, onSubmit }: QueryPanelProps) {
  const [form] = Form.useForm<QueryRequest>();
  const mode = Form.useWatch("mode", form);

  useEffect(() => {
    if (graphs.length > 0 && !form.getFieldValue("graph_id")) {
      form.setFieldsValue({ graph_id: graphs[0].id, mode: "local", response_type: "Multiple Paragraphs" });
    }
  }, [form, graphs]);

  return (
    <Card className="surface-card" title="发起问答">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          mode: "local",
          community_level: 2,
          response_type: "Multiple Paragraphs",
          dynamic_community_selection: false,
        }}
        onFinish={(values) => void onSubmit(values)}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Form.Item<QueryRequest> label="图谱项目" name="graph_id" rules={[{ required: true }]}>
            <Select
              placeholder="选择图谱"
              options={graphs.map((graph) => ({ label: graph.name, value: graph.id }))}
            />
          </Form.Item>
          <Form.Item<QueryRequest> label="查询模式" name="mode" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Local Search", value: "local" },
                { label: "Global Search", value: "global" },
                { label: "Basic Search", value: "basic" },
                { label: "Drift Search", value: "drift" },
              ]}
            />
          </Form.Item>
          <Form.Item<QueryRequest> label="Community Level" name="community_level">
            <InputNumber min={1} max={10} style={{ width: "100%" }} disabled={mode === "basic"} />
          </Form.Item>
          <Form.Item<QueryRequest> label="响应格式" name="response_type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Multiple Paragraphs", value: "Multiple Paragraphs" },
                { label: "Bulleted List", value: "Bulleted List" },
                { label: "Single Sentence", value: "Single Sentence" },
              ]}
            />
          </Form.Item>
          <Form.Item<QueryRequest> label="问题" name="question" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="例如: 退款流程有哪些关键节点?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            开始查询
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
