import { SWRConfig } from "swr";
import "./index.css";
import { resourceFetcher } from "./hooks";
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "../components/ui/sonner";
import { CreateHandlerPage } from "./pages/CreateHandlerPage";
import { CreateRequestPage } from "./pages/CreateRequestPage";
import { EditHandlerPage } from "./pages/EditHandlerPage";
import { HomePage } from "./pages/HomePage";
import { RequestPage } from "./pages/RequestPage";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Layout } from "@/components/Layout";

export function App() {
  return (
    <SWRConfig
      value={{
        fetcher: resourceFetcher,
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "425px",
          } as React.CSSProperties
        }
      >
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route index element={<HomePage />} />
              <Route path="/requests/new" element={<CreateRequestPage />} />
              <Route path="/requests/:id" element={<RequestPage />} />
              <Route path="/handlers/new" element={<CreateHandlerPage />} />
              <Route path="/handlers/:id" element={<EditHandlerPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <Toaster position="top-center" />
      </SidebarProvider>
    </SWRConfig>
  );
}
