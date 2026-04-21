import type {
  GraphBuildPayload,
  GraphBuildRequest,
  GraphCreateRequest,
  GraphDetailPayload,
  GraphStatusPayload,
  GraphSummary,
  ModelProfileResponse,
  ModelProfileCreateRequest,
  ModelProfileUpdateRequest,
  QueryRequest,
  QueryResponsePayload,
  SourceFileItem,
  SystemConfigPayload,
} from "../../shared/types/api";

export interface GraphRepository {
  listGraphs(): Promise<GraphSummary[]>;
  getGraph(graphId: string): Promise<GraphDetailPayload>;
  getGraphStatus(graphId: string): Promise<GraphStatusPayload>;
  createGraph(payload: GraphCreateRequest): Promise<GraphDetailPayload>;
  deleteGraph(graphId: string): Promise<void>;
  listGraphFiles(graphId: string): Promise<SourceFileItem[]>;
  uploadGraphFiles(graphId: string, files: File[]): Promise<SourceFileItem[]>;
  startGraphBuild(
    graphId: string,
    payload: GraphBuildRequest,
  ): Promise<GraphBuildPayload>;
}

export interface QueryRepository {
  runQuery(payload: QueryRequest): Promise<QueryResponsePayload>;
}

export interface SettingsRepository {
  getSystemConfig(): Promise<SystemConfigPayload>;
  updateSystemConfig(payload: SystemConfigPayload): Promise<SystemConfigPayload>;
  listModelProfiles(): Promise<ModelProfileResponse[]>;
  createModelProfile(
    payload: ModelProfileCreateRequest,
  ): Promise<ModelProfileResponse>;
  updateModelProfile(
    profileId: string,
    payload: ModelProfileUpdateRequest,
  ): Promise<ModelProfileResponse>;
  deleteModelProfile(profileId: string): Promise<void>;
}

export interface RepositoryBundle {
  graphRepository: GraphRepository;
  queryRepository: QueryRepository;
  settingsRepository: SettingsRepository;
}
