import type { GraphSummary } from "../types";

interface ResolveQueryGraphIdOptions {
  graphs: GraphSummary[];
  requestedGraphId?: string | null;
  currentGraphId?: string;
}

function graphExists(graphs: GraphSummary[], graphId?: string | null) {
  return Boolean(graphId && graphs.some((graph) => graph.id === graphId));
}

export function resolveQueryGraphId({
  graphs,
  requestedGraphId,
  currentGraphId,
}: ResolveQueryGraphIdOptions): string | undefined {
  if (graphExists(graphs, requestedGraphId)) {
    return requestedGraphId ?? undefined;
  }

  if (graphExists(graphs, currentGraphId)) {
    return currentGraphId;
  }

  return graphs[0]?.id;
}
