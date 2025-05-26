import { OverlaysProvider } from "@blueprintjs/core";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { SWRConfig } from "swr";

import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

import "./global.css";
import { HomePage } from "./components/HomePage";
import { RequestPage } from "./components/RequestPage";
import { resourceFetcher } from "./hooks";
import { EditHandlerPage } from "./components/EditHandlerPage";
import { CreateHandlerPage } from "./components/CreateHandlerPage";

const App = () => (
  <SWRConfig
    value={{
      fetcher: resourceFetcher,
    }}
  >
    <OverlaysProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="/requests/:id" element={<RequestPage />} />
          <Route path="/handlers/new" element={<CreateHandlerPage />} />
          <Route path="/handlers/:id" element={<EditHandlerPage />} />
        </Routes>
      </BrowserRouter>
    </OverlaysProvider>
  </SWRConfig>
);

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});
