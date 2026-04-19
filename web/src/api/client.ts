import type {
  ApiResponse,
  DeleteArtifactsPayload,
  DeleteGraphPayload,
  DeleteModelProfilePayload,
  DeleteTextUnitPayload,
  GraphBuildPayload,
  GraphBuildRequest,
  GraphCreateRequest,
  GraphDetailPayload,
  GraphListPayload,
  GraphPreviewPayload,
  GraphReportsPayload,
  GraphStatusPayload,
  GraphTextUnitListPayload,
  ModelProfileCreateRequest,
  ModelProfileListPayload,
  ModelProfileResponse,
  ModelProfileUpdateRequest,
  QueryRequest,
  QueryResponsePayload,
  SourceFileListPayload,
  SystemConfigPayload,
} from "../types";

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const body = init.body;

  if (body !== undefined && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const responseText = await response.text();
  let payload: ApiResponse<T> | null = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (payload === null) {
    const detail = responseText.trim();
    const fallbackMessage = detail
      ? `HTTP ${response.status}: ${detail}`
      : `HTTP ${response.status}: Request failed for ${path}`;
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `Request failed for ${path}`);
  }

  return payload.data;
}

export async function getGraphs(): Promise<GraphListPayload> {
  return requestJson<GraphListPayload>("/api/graph");
}

export async function createGraph(payload: GraphCreateRequest): Promise<GraphDetailPayload> {
  return requestJson<GraphDetailPayload>("/api/graph", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getGraph(graphId: string): Promise<GraphDetailPayload> {
  return requestJson<GraphDetailPayload>(`/api/graph/${graphId}`);
}

export async function getGraphFiles(graphId: string): Promise<SourceFileListPayload> {
  return requestJson<SourceFileListPayload>(`/api/graph/${graphId}/files`);
}

export async function uploadGraphFiles(
  graphId: string,
  files: File[],
): Promise<SourceFileListPayload> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return requestJson<SourceFileListPayload>(`/api/graph/${graphId}/files`, {
    method: "POST",
    body: formData,
  });
}

export async function buildGraph(
  graphId: string,
  payload: GraphBuildRequest,
): Promise<GraphBuildPayload> {
  return requestJson<GraphBuildPayload>(`/api/graph/${graphId}/build`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getGraphStatus(graphId: string): Promise<GraphStatusPayload> {
  return requestJson<GraphStatusPayload>(`/api/graph/${graphId}/status`);
}

export async function clearGraphArtifacts(graphId: string): Promise<DeleteArtifactsPayload> {
  return requestJson<DeleteArtifactsPayload>(`/api/graph/${graphId}/artifacts`, {
    method: "DELETE",
  });
}

export async function deleteGraph(graphId: string): Promise<DeleteGraphPayload> {
  return requestJson<DeleteGraphPayload>(`/api/graph/${graphId}`, {
    method: "DELETE",
  });
}

export async function getGraphTextUnits(graphId: string): Promise<GraphTextUnitListPayload> {
  return requestJson<GraphTextUnitListPayload>(`/api/graph/${graphId}/text-units`);
}

export async function deleteGraphTextUnit(
  graphId: string,
  textUnitId: string,
): Promise<DeleteTextUnitPayload> {
  return requestJson<DeleteTextUnitPayload>(`/api/graph/${graphId}/text-units/${textUnitId}`, {
    method: "DELETE",
  });
}

export async function getGraphPreview(graphId: string): Promise<GraphPreviewPayload> {
  return requestJson<GraphPreviewPayload>(`/api/graph/${graphId}/graph`);
}

export async function getGraphReports(graphId: string): Promise<GraphReportsPayload> {
  return requestJson<GraphReportsPayload>(`/api/graph/${graphId}/reports`);
}

export async function getSystemConfig(): Promise<SystemConfigPayload> {
  return requestJson<SystemConfigPayload>("/api/config/system");
}

export async function updateSystemConfig(
  payload: SystemConfigPayload,
): Promise<SystemConfigPayload> {
  return requestJson<SystemConfigPayload>("/api/config/system", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listModelProfiles(): Promise<ModelProfileListPayload> {
  return requestJson<ModelProfileListPayload>("/api/config/models");
}

export async function createModelProfile(
  payload: ModelProfileCreateRequest,
): Promise<ModelProfileResponse> {
  return requestJson<ModelProfileResponse>("/api/config/models", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateModelProfile(
  profileId: string,
  payload: ModelProfileUpdateRequest,
): Promise<ModelProfileResponse> {
  return requestJson<ModelProfileResponse>(`/api/config/models/${profileId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteModelProfile(
  profileId: string,
): Promise<DeleteModelProfilePayload> {
  return requestJson<DeleteModelProfilePayload>(`/api/config/models/${profileId}`, {
    method: "DELETE",
  });
}

export async function queryGraph(payload: QueryRequest): Promise<QueryResponsePayload> {
  return requestJson<QueryResponsePayload>("/api/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
