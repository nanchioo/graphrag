export type QueryMode = "local" | "global" | "drift" | "basic";
export type ModelProvider = "openai" | "azure" | "ollama";
export type GraphBuildMethod = "standard" | "fast";

export interface GraphSummary {
  id: string;
  name: string;
  status: string;
  model_profile_id?: string | null;
  description?: string | null;
  entity_count?: number;
  relation_count?: number;
  document_count?: number;
  storage_size?: string;
  indexing_method?: string;
  owner?: string;
  owner_initials?: string;
  updated_at?: string;
  status_label?: string;
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
  entity_count?: number;
  relation_count?: number;
  community_count?: number;
  report_count?: number;
  source_count?: number;
  owner?: string;
  storage_size?: string;
}

export interface GraphStatusPayload {
  graph_id: string;
  status: string;
  last_build_at?: string | null;
  last_error?: string | null;
  has_source_files?: boolean;
  source_file_count?: number;
  document_count?: number;
  has_artifacts: boolean;
  artifact_paths?: string[];
  text_unit_count: number;
  progress_percent: number;
  progress_stage: string;
  progress_message: string;
  token_count?: number;
  queue_position?: number;
  error_message?: string | null;
}

export interface ModelProfileResponse {
  id: string;
  provider: ModelProvider;
  name: string;
  base_url: string;
  model_name: string;
  embedding_model_name?: string | null;
  is_default: boolean;
  has_api_key: boolean;
  deployment?: string;
  api_version?: string;
}

export interface ModelProfileCreateRequest {
  provider: ModelProvider;
  name: string;
  base_url: string;
  api_key?: string | null;
  model_name: string;
  embedding_model_name?: string | null;
  deployment?: string | null;
  api_version?: string | null;
  is_default: boolean;
}

export interface ModelProfileUpdateRequest {
  provider?: ModelProvider;
  name?: string;
  base_url?: string;
  api_key?: string | null;
  model_name?: string;
  embedding_model_name?: string | null;
  deployment?: string | null;
  api_version?: string | null;
  is_default?: boolean;
  clear_api_key?: boolean;
}

export interface SystemConfigPayload {
  projects_root: string;
  upload_root: string;
  default_model_profile_id?: string | null;
  llm_provider?: string;
  llm_model?: string;
  api_base?: string;
  deployment?: string;
  api_version?: string;
  concurrency?: number;
  rate_limit_per_minute?: number;
  max_retries?: number;
  enable_llm_cache?: boolean;
}

export interface QueryResponsePayload {
  graph_id: string;
  mode: QueryMode;
  answer: string | Record<string, unknown> | Array<Record<string, unknown>>;
  context: Record<string, unknown>;
  latency_label?: string;
  token_count_label?: string;
  hit_context_count?: number;
  hit_community_count?: number;
  response_type?: string;
  execution_chain?: string[];
  recent_queries?: string[];
}

export interface QueryRequest {
  graph_id: string;
  question: string;
  mode: QueryMode;
  community_level?: number | null;
  response_type?: string;
  dynamic_community_selection?: boolean;
}

export interface GraphCreateRequest {
  name: string;
  description?: string | null;
  model_profile_id?: string | null;
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

export interface SourceFileItem {
  name: string;
  relative_path: string;
  extension: string;
  size_bytes: number;
  created_at: string;
}
