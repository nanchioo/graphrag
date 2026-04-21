import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import { createMockRepositories } from "../../services/repositories/mockRepositories";
import type { RepositoryBundle } from "../../services/repositories/types";

const RepositoryContext = createContext<RepositoryBundle | null>(null);

export function RepositoryProvider({ children }: PropsWithChildren) {
  const repositories = useMemo(() => createMockRepositories(), []);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories() {
  const value = useContext(RepositoryContext);

  if (!value) {
    throw new Error("RepositoryProvider is missing");
  }

  return value;
}
