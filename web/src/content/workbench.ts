import type { QueryMode } from "../types";

export const navigationItems = [
  { key: "/graphs", label: "图谱管理" },
  { key: "/models", label: "模型配置" },
  { key: "/query", label: "问答控制台" },
];

export const GRAPH_STATUS_META = {
  awaiting_upload: { color: "default", label: "待上传" },
  awaiting_build: { color: "gold", label: "待构建" },
  ready: { color: "green", label: "可查询" },
  building: { color: "processing", label: "构建中" },
  failed: { color: "red", label: "构建失败" },
  artifacts_deleted: { color: "orange", label: "待构建" },
  initialized: { color: "default", label: "待上传" },
} as const;

export const GRAPH_STAGE_LABELS = {
  awaiting_upload: "等待上传",
  awaiting_build: "等待构建",
  build_started: "启动构建",
  documents_indexed: "文档整理",
  text_units_created: "文本切片",
  reports_generation: "社区报告生成",
  embedding_generation: "向量生成",
  completed: "构建完成",
} as const;

export const QUERY_MODE_OPTIONS: Array<{ label: string; value: QueryMode }> = [
  { label: "Local Search", value: "local" },
  { label: "Global Search", value: "global" },
  { label: "Basic Search", value: "basic" },
  { label: "Drift Search", value: "drift" },
];

export const QUERY_CONTEXT_LABELS: Record<string, string> = {
  reports: "社区报告",
  entities: "实体",
  relationships: "关系",
  sources: "来源",
  claims: "声明",
  covariates: "协变量",
  text_units: "文本切片",
  communities: "社区",
};

export function getGraphStatusMeta(status: string) {
  return GRAPH_STATUS_META[status as keyof typeof GRAPH_STATUS_META] ?? {
    color: "default",
    label: status,
  };
}

export function getGraphStageLabel(stage: string) {
  return GRAPH_STAGE_LABELS[stage as keyof typeof GRAPH_STAGE_LABELS] ?? stage;
}

export function getQueryContextLabel(key: string) {
  return QUERY_CONTEXT_LABELS[key] ?? key;
}
