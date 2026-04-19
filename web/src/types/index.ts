export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type GraphBuildMethod = "standard" | "fast";
export type QueryMode = "local" | "global" | "basic" | "drift";
export type ModelProvider = "openai" | "azure" | "ollama";

export interface GraphSummary {
  id: string;
  name: string;
  status: string;
  model_profile_id?: string | null;
}

export interface GraphListPayload {
  items: GraphSummary[];
  total: number;
}

export interface GraphDetailPayload {
  id: string;
  name: string;
  description?: string | null;
  root_dir: string;
  status: string;
  model_profile_id?: string | null;
  created_at: string;
  last_build_at?: string | null;
}

export interface GraphCreateRequest {
  name: string;
  description?: string;
  model_profile_id?: string;
}

export interface SourceFileItem {
  name: string;
  relative_path: string;
  extension: string;
  size_bytes: number;
  created_at: string;
}

export interface SourceFileListPayload {
  items: SourceFileItem[];
  total: number;
}

export interface GraphBuildRequest {
  method: GraphBuildMethod;
  force_rebuild: boolean;
}

export interface GraphBuildPayload {
  graph_id: string;
  status: string;
  last_build_at?: string | null;
  last_error?: string | null;
}

export interface GraphStatusPayload {
  graph_id: string;
  status: string;
  last_build_at?: string | null;
  last_error?: string | null;
  has_source_files: boolean;
  source_file_count: number;
  document_count: number;
  text_unit_count: number;
  has_artifacts: boolean;
  artifact_paths: string[];
  progress_percent: number;
  progress_stage: string;
  progress_message: string;
}

export interface DeleteArtifactsPayload {
  graph_id: string;
  status: string;
  deleted_paths: string[];
}

export interface DeleteGraphPayload {
  graph_id: string;
  status: string;
  deleted_root_dir: string;
  cancelled_build: boolean;
}

export interface GraphTextUnitItem {
  id: string;
  human_readable_id?: number | null;
  text: string;
  n_tokens?: number | null;
  document_id?: string | null;
}

export interface GraphTextUnitListPayload {
  items: GraphTextUnitItem[];
  total: number;
}

export interface DeleteTextUnitPayload {
  graph_id: string;
  text_unit_id: string;
  status: string;
  remaining_total: number;
}

export interface GraphPreviewNode {
  id: string;
  entity_id: string;
  label: string;
  type?: string | null;
  rank?: number | null;
  community_ids: string[];
}

export interface GraphPreviewEdge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  weight?: number | null;
}

export interface GraphPreviewSummary {
  total_nodes: number;
  total_edges: number;
  total_communities: number;
  total_reports: number;
  preview_nodes: number;
  preview_edges: number;
}

export interface GraphPreviewPayload {
  nodes: GraphPreviewNode[];
  edges: GraphPreviewEdge[];
  summary: GraphPreviewSummary;
}

export interface GraphReportItem {
  id: string;
  title: string;
  community_id: string;
  summary: string;
  rank?: number | null;
}

export interface GraphReportsPayload {
  items: GraphReportItem[];
  total: number;
}

export interface SystemConfigPayload {
  projects_root: string;
  upload_root: string;
  default_model_profile_id?: string | null;
}

export interface ModelProfileResponse {
  id: string;
  provider: ModelProvider;
  name: string;
  base_url: string;
  model_name: string;
  embedding_model_name?: string | null;
  api_version?: string | null;
  is_default: boolean;
  has_api_key: boolean;
  api_key_masked?: string | null;
}

export interface ModelProfileListPayload {
  items: ModelProfileResponse[];
  total: number;
}

export interface ModelProfileCreateRequest {
  provider: ModelProvider;
  name: string;
  base_url: string;
  api_key?: string;
  model_name: string;
  embedding_model_name?: string;
  api_version?: string;
  is_default: boolean;
}

export interface ModelProfileUpdateRequest {
  provider?: ModelProvider;
  name?: string;
  base_url?: string;
  api_key?: string;
  model_name?: string;
  embedding_model_name?: string;
  api_version?: string;
  is_default?: boolean;
  clear_api_key?: boolean;
}

export interface DeleteModelProfilePayload {
  deleted_id: string;
}

export interface QueryRequest {
  graph_id: string;
  question: string;
  mode: QueryMode;
  community_level?: number | null;
  response_type: string;
  dynamic_community_selection?: boolean;
}

export interface QueryResponsePayload {
  graph_id: string;
  mode: QueryMode;
  answer: string | Record<string, unknown> | Array<Record<string, unknown>>;
  context: Record<string, unknown>;
}
