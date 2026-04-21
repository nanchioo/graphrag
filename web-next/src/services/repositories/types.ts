import type {
  GraphDetailPayload,
  GraphStatusPayload,
  GraphSummary,
  ModelProfileResponse,
  QueryMode,
  QueryResponsePayload,
  SystemConfigPayload,
} from "../../shared/types/api";

export interface GraphRepository {
  listGraphs(): Promise<GraphSummary[]>;
  getGraph(graphId: string): Promise<GraphDetailPayload>;
  getGraphStatus(graphId: string): Promise<GraphStatusPayload>;
}

export interface QueryRepository {
  runSampleQuery(
    graphId: string,
    mode: QueryMode,
  ): Promise<QueryResponsePayload>;
}

export interface SettingsRepository {
  getSystemConfig(): Promise<SystemConfigPayload>;
  listModelProfiles(): Promise<ModelProfileResponse[]>;
}

export interface RepositoryBundle {
  graphRepository: GraphRepository;
  queryRepository: QueryRepository;
  settingsRepository: SettingsRepository;
}
