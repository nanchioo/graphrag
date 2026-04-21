import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import { createHttpRepositories } from "../../services/repositories/httpRepositories";
import type { RepositoryBundle } from "../../services/repositories/types";

const RepositoryContext = createContext<RepositoryBundle | null>(null);

export function RepositoryProvider({ children }: PropsWithChildren) {
  const repositories = useMemo(() => createHttpRepositories(), []);

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
