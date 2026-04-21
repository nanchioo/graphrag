import { RouterProvider } from "react-router-dom";

import { RepositoryProvider } from "./app/providers/RepositoryProvider";
import { router } from "./app/router/routes";
import "./styles/tokens.css";
import "./styles/globals.css";
import "./styles/utilities.css";

export default function App() {
  return (
    <RepositoryProvider>
      <RouterProvider router={router} />
    </RepositoryProvider>
  );
}
