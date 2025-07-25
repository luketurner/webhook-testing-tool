import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "../components/ui/sonner";
import { CreateHandlerPage } from "./pages/create-handler-page";
import { CreateRequestPage } from "./pages/create-request-page";
import { EditHandlerPage } from "./pages/edit-handler-page";
import { HomePage } from "./pages/home-page";
import { RequestPage } from "./pages/request-page";
import { SharedRequestPage } from "./pages/shared-request-page";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Layout } from "@/components/layout";
import { SSEProvider } from "@/components/sse-provider";
import { SessionProvider } from "@/auth/session-provider";
import { LoginForm } from "@/auth/login-form";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/shared/:sharedId"
            element={
              <>
                <SharedRequestPage />
                <Toaster position="top-center" />
              </>
            }
          />

          {/* Authenticated routes */}
          <Route
            path="/*"
            element={
              <SessionProvider fallback={<LoginForm />}>
                <SSEProvider>
                  <SidebarProvider
                    style={
                      {
                        "--sidebar-width": "425px",
                      } as React.CSSProperties
                    }
                  >
                    <Layout>
                      <Routes>
                        <Route index element={<HomePage />} />
                        <Route
                          path="/requests/new"
                          element={<CreateRequestPage />}
                        />
                        <Route path="/requests/:id" element={<RequestPage />} />
                        <Route
                          path="/handlers/new"
                          element={<CreateHandlerPage />}
                        />
                        <Route
                          path="/handlers/:id"
                          element={<EditHandlerPage />}
                        />
                      </Routes>
                    </Layout>
                    <Toaster position="top-center" />
                  </SidebarProvider>
                </SSEProvider>
              </SessionProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
