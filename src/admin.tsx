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
import { HandlerPage } from "./components/HandlerPage";

function fetchApi(resource: string, init?: RequestInit) {
  return fetch("/api" + resource, init);
}

const App = () => (
  <SWRConfig
    value={{
      fetcher: (resource, init) =>
        fetchApi(resource, init).then((res) => res.json()),
    }}
  >
    <OverlaysProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="/requests/:id" element={<RequestPage />} />
          <Route path="/handlers/:id" element={<HandlerPage />} />
        </Routes>
      </BrowserRouter>
    </OverlaysProvider>
  </SWRConfig>
);

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});
