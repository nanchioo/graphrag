import { Button, Card, Popconfirm, Space, Table, Tag, Typography } from "antd";

import { getGraphStatusMeta } from "../content/workbench";
import type { GraphSummary } from "../types";

const GRAPH_LIFECYCLE_STATUSES = ["awaiting_upload", "awaiting_build"] as const;

interface GraphTableProps {
  graphs: GraphSummary[];
  loading: boolean;
  selectedGraphId?: string;
  onRefresh: () => void;
  onSelect: (graph: GraphSummary) => void;
  onDelete: (graph: GraphSummary) => void;
}

export function GraphTable({
  graphs,
  loading,
  selectedGraphId,
  onRefresh,
  onSelect,
  onDelete,
}: GraphTableProps) {
  void GRAPH_LIFECYCLE_STATUSES;

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
        locale={{ emptyText: "暂无图谱项目。" }}
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
              const meta = getGraphStatusMeta(status);
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
