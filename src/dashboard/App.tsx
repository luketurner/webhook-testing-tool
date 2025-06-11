import { SWRConfig } from "swr";
import "./index.css";
import { CreateHandlerPage } from "../components/CreateHandlerPage";
import { EditHandlerPage } from "../components/EditHandlerPage";
import { HomePage } from "../components/HomePage";
import { RequestPage } from "../components/RequestPage";
import { resourceFetcher } from "../hooks";
import { BrowserRouter, Routes, Route } from "react-router";
import { ManageHandlersPage } from "../components/ManageHandlersPage";
import { CreateRequestPage } from "../components/CreateRequestPage";
import { Toaster } from "../components/ui/sonner";

export function App() {
  return (
    <SWRConfig
      value={{
        fetcher: resourceFetcher,
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="/requests/new" element={<CreateRequestPage />} />
          <Route path="/requests/:id" element={<RequestPage />} />
          <Route path="/handlers" element={<ManageHandlersPage />} />
          <Route path="/handlers/new" element={<CreateHandlerPage />} />
          <Route path="/handlers/:id" element={<EditHandlerPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </SWRConfig>
  );
}
