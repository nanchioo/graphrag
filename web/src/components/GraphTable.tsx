import { Button, Empty, Popconfirm, Space, Spin, Table, Tag, Typography } from "antd";

import { getGraphStatusMeta } from "../content/workbench";
import type { GraphSummary } from "../types";

const GRAPH_LIFECYCLE_STATUSES = ["awaiting_upload", "awaiting_build"] as const;

interface GraphTableProps {
  graphs: GraphSummary[];
  loading: boolean;
  selectedGraphId?: string;
  compact?: boolean;
  onRefresh: () => void;
  onSelect: (graph: GraphSummary) => void;
  onQuery?: (graph: GraphSummary) => void;
  onDelete: (graph: GraphSummary) => void;
}

export function GraphTable({
  graphs,
  loading,
  selectedGraphId,
  compact = false,
  onRefresh,
  onSelect,
  onQuery,
  onDelete,
}: GraphTableProps) {
  void GRAPH_LIFECYCLE_STATUSES;
  void onRefresh;

  if (compact) {
    return (
      <Spin spinning={loading}>
        {graphs.length > 0 ? (
          <div className="graph-project-list">
            {graphs.map((graph) => {
              const meta = getGraphStatusMeta(graph.status);
              const selected = graph.id === selectedGraphId;

              return (
                <div
                  className={`graph-project-item${selected ? " active" : ""}`}
                  key={graph.id}
                >
                  <button
                    type="button"
                    className="graph-project-main"
                    onClick={() => onSelect(graph)}
                    aria-current={selected ? "true" : undefined}
                  >
                    <span className="graph-project-name">{graph.name}</span>
                    <span className="graph-project-id">{graph.id}</span>
                    <span className="graph-project-description">点击进入图谱管理工作台</span>
                  </button>
                  <div className="graph-project-meta">
                    <Tag color={meta.color}>{meta.label}</Tag>
                    <Button size="small" type="primary" onClick={() => onSelect(graph)}>
                      管理图谱
                    </Button>
                    {onQuery ? (
                      <Button size="small" onClick={() => onQuery(graph)}>
                        去问答
                      </Button>
                    ) : null}
                    <Popconfirm
                      title="确认删除这个图谱项目?"
                      description="删除后将同时移除工作目录和构建产物。"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => onDelete(graph)}
                    >
                      <Button size="small" danger>
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无图谱项目。" />
        )}
      </Spin>
    );
  }

  return (
    <Table
      rowKey="id"
      size="middle"
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
          title: "描述",
          dataIndex: "description",
          key: "description",
          ellipsis: true,
          render: (desc: string) => <span className="muted-text">{desc || "-"}</span>,
        },
        {
          title: "状态",
          dataIndex: "status",
          key: "status",
          width: 140,
          render: (status: string) => {
            const meta = getGraphStatusMeta(status);
            return <Tag color={meta.color}>{meta.label}</Tag>;
          },
        },
        {
          title: "操作",
          key: "actions",
          width: 260,
          render: (_, record) => (
            <Space size="small" onClick={(event) => event.stopPropagation()}>
              <Button size="small" type="primary" onClick={() => onSelect(record)}>
                管理图谱
              </Button>
              {onQuery ? (
                <Button size="small" onClick={() => onQuery(record)}>
                  去问答
                </Button>
              ) : null}
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
  );
}
