import { mockGraphDetails, mockGraphs, mockGraphStatuses } from "../../mocks/fixtures/graphs";
import { mockQueryResults } from "../../mocks/fixtures/query";
import { mockModelProfiles, mockSystemConfig } from "../../mocks/fixtures/settings";
import type { RepositoryBundle } from "./types";

export function createMockRepositories(): RepositoryBundle {
  return {
    graphRepository: {
      async listGraphs() {
        return mockGraphs;
      },
      async getGraph(graphId) {
        return mockGraphDetails[graphId] ?? mockGraphDetails["demo-001"];
      },
      async getGraphStatus(graphId) {
        return mockGraphStatuses[graphId] ?? mockGraphStatuses["demo-001"];
      },
    },
    queryRepository: {
      async runSampleQuery(graphId, mode) {
        const key = `${graphId}:${mode}`;
        return (
          mockQueryResults[key] ??
          mockQueryResults["demo-001:global"]
        );
      },
    },
    settingsRepository: {
      async getSystemConfig() {
        return mockSystemConfig;
      },
      async listModelProfiles() {
        return mockModelProfiles;
      },
    },
  };
}
