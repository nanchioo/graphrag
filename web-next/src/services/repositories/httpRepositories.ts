import type {
  GraphBuildPayload,
  GraphBuildRequest,
  GraphCreateRequest,
  GraphDetailPayload,
  GraphStatusPayload,
  GraphSummary,
  ModelProfileCreateRequest,
  ModelProfileResponse,
  ModelProfileUpdateRequest,
  QueryRequest,
  QueryResponsePayload,
  SourceFileItem,
  SystemConfigPayload,
} from "../../shared/types/api";
import type { RepositoryBundle } from "./types";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload.data;
}

function toSourceFileList(data: { items: SourceFileItem[]; total: number }) {
  return data.items;
}

export function createHttpRepositories(): RepositoryBundle {
  return {
    graphRepository: {
      listGraphs() {
        return requestJson<{ items: GraphSummary[]; total: number }>("/api/graph").then(
          (data) => data.items,
        );
      },
      getGraph(graphId) {
        return requestJson<GraphDetailPayload>(`/api/graph/${graphId}`);
      },
      getGraphStatus(graphId) {
        return requestJson<GraphStatusPayload>(`/api/graph/${graphId}/status`);
      },
      createGraph(payload: GraphCreateRequest) {
        return requestJson<GraphDetailPayload>("/api/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      async deleteGraph(graphId) {
        await requestJson(`/api/graph/${graphId}`, {
          method: "DELETE",
        });
      },
      listGraphFiles(graphId) {
        return requestJson<{ items: SourceFileItem[]; total: number }>(
          `/api/graph/${graphId}/files`,
        ).then(toSourceFileList);
      },
      uploadGraphFiles(graphId, files) {
        const body = new FormData();
        for (const file of files) {
          body.append("files", file);
        }

        return requestJson<{ items: SourceFileItem[]; total: number }>(
          `/api/graph/${graphId}/files`,
          {
            method: "POST",
            body,
          },
        ).then(toSourceFileList);
      },
      startGraphBuild(graphId, payload: GraphBuildRequest) {
        return requestJson<GraphBuildPayload>(`/api/graph/${graphId}/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
    },
    queryRepository: {
      runQuery(payload: QueryRequest) {
        return requestJson<QueryResponsePayload>("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
    },
    settingsRepository: {
      getSystemConfig() {
        return requestJson<SystemConfigPayload>("/api/config/system");
      },
      updateSystemConfig(payload: SystemConfigPayload) {
        return requestJson<SystemConfigPayload>("/api/config/system", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      listModelProfiles() {
        return requestJson<{ items: ModelProfileResponse[]; total: number }>(
          "/api/config/models",
        ).then((data) => data.items);
      },
      createModelProfile(payload: ModelProfileCreateRequest) {
        return requestJson<ModelProfileResponse>("/api/config/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      updateModelProfile(profileId, payload: ModelProfileUpdateRequest) {
        return requestJson<ModelProfileResponse>(`/api/config/models/${profileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      async deleteModelProfile(profileId) {
        await requestJson(`/api/config/models/${profileId}`, {
          method: "DELETE",
        });
      },
    },
  };
}
