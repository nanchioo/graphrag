import { Button, Card, Empty, Popconfirm, Space, Table, Typography } from "antd";

import type { GraphTextUnitItem } from "../types";

interface TextUnitListProps {
  items: GraphTextUnitItem[];
  loading?: boolean;
  busy?: boolean;
  onDelete: (textUnit: GraphTextUnitItem) => void;
}

function excerpt(text: string, maxLength = 140) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

export function TextUnitList({
  items,
  loading = false,
  busy = false,
  onDelete,
}: TextUnitListProps) {
  return (
    <Card className="surface-card analysis-card analysis-text-unit-list" title="文本切片">
      {items.length === 0 ? (
        <Empty description="当前图谱还没有可展示的文本切片。" />
      ) : (
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={items}
          tableLayout="fixed"
          scroll={{ x: 820 }}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          columns={[
            {
              title: "切片内容",
              dataIndex: "text",
              key: "text",
              width: 420,
              render: (text: string, record: GraphTextUnitItem) => (
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Typography.Text strong>
                    {record.human_readable_id != null
                      ? `切片 #${record.human_readable_id}`
                      : "文本切片"}
                  </Typography.Text>
                  <Typography.Paragraph
                    style={{ marginBottom: 0 }}
                    ellipsis={{ rows: 3, expandable: true, symbol: "展开" }}
                  >
                    {excerpt(text)}
                  </Typography.Paragraph>
                  <Typography.Text
                    className="muted-text"
                    ellipsis={{ tooltip: record.id }}
                    style={{ maxWidth: "100%" }}
                  >
                    {record.id}
                  </Typography.Text>
                </Space>
              ),
            },
            {
              title: "文档",
              dataIndex: "document_id",
              key: "document_id",
              width: 180,
              render: (value: string | null | undefined) =>
                value ? (
                  <Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 150 }}>
                    {value}
                  </Typography.Text>
                ) : (
                  "-"
                ),
            },
            {
              title: "Tokens",
              dataIndex: "n_tokens",
              key: "n_tokens",
              width: 90,
              render: (value: number | null | undefined) => value ?? "-",
            },
            {
              title: "操作",
              key: "actions",
              width: 120,
              render: (_, record: GraphTextUnitItem) => (
                <Popconfirm
                  title="确认删除这个切片?"
                  description="删除后需要重新构建，图谱预览和报告结果会失效。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => onDelete(record)}
                >
                  <Button size="small" danger loading={busy}>
                    删除
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
