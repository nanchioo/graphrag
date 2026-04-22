import { Button, Card, Popconfirm, Space, Table, Tag, Typography } from "antd";

import type { GraphSummary } from "../types";

interface GraphTableProps {
  graphs: GraphSummary[];
  loading: boolean;
  selectedGraphId?: string;
  onRefresh: () => void;
  onSelect: (graph: GraphSummary) => void;
  onDelete: (graph: GraphSummary) => void;
}

function statusMeta(status: string) {
  switch (status) {
    case "awaiting_upload":
      return { color: "default", label: "待上传" };
    case "awaiting_build":
      return { color: "gold", label: "待构建" };
    case "ready":
      return { color: "green", label: "可查询" };
    case "building":
      return { color: "processing", label: "构建中" };
    case "failed":
      return { color: "red", label: "构建失败" };
    case "artifacts_deleted":
      return { color: "orange", label: "待构建" };
    case "initialized":
      return { color: "default", label: "待上传" };
    default:
      return { color: "default", label: status };
  }
}

export function GraphTable({
  graphs,
  loading,
  selectedGraphId,
  onRefresh,
  onSelect,
  onDelete,
}: GraphTableProps) {
  return (
    <Card
      className="surface-card analysis-card analysis-sidebar-table"
      title="图谱项目"
      extra={
        <Button size="small" onClick={onRefresh}>
          刷新
        </Button>
      }
    >
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={graphs}
        pagination={false}
        locale={{ emptyText: "还没有图谱项目" }}
        rowClassName={(record) => (record.id === selectedGraphId ? "selected-row" : "")}
        onRow={(record) => ({
          onClick: () => onSelect(record),
        })}
        columns={[
          {
            title: "名称",
            dataIndex: "name",
            key: "name",
            render: (_, record) => (
              <div>
                <Typography.Text strong>{record.name}</Typography.Text>
                <div className="muted-text">{record.id}</div>
              </div>
            ),
          },
          {
            title: "状态",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (status: string) => {
              const meta = statusMeta(status);
              return <Tag color={meta.color}>{meta.label}</Tag>;
            },
          },
          {
            title: "操作",
            key: "actions",
            width: 120,
            render: (_, record) => (
              <Space size="small" onClick={(event) => event.stopPropagation()}>
                <Popconfirm
                  title="确认删除这个图谱项目?"
                  description="删除后将同时移除工作目录和构建产物。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => onDelete(record)}
                >
                  <Button size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
