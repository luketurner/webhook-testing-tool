import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "../components/ui/sonner";
import { CreateHandlerPage } from "./pages/CreateHandlerPage";
import { CreateRequestPage } from "./pages/CreateRequestPage";
import { EditHandlerPage } from "./pages/EditHandlerPage";
import { HomePage } from "./pages/HomePage";
import { RequestPage } from "./pages/RequestPage";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Layout } from "@/components/Layout";
import { SSEProvider } from "@/components/sse-provider";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SSEProvider>
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
      </SSEProvider>
    </QueryClientProvider>
  );
}
