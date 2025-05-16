import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { SWRConfig } from "swr";

const Layout = ({ children }) => {
  return <div>{children}</div>;
};

const AdminMainView = () => {
  return <p>Main view</p>;
};

const AdminRequestView = () => {
  return <p>Request view</p>;
};

const App = () => (
  <SWRConfig
    value={{
      fetcher: (resource, init) =>
        fetch("/api" + resource, init).then((res) => res.json()),
    }}
  >
    <Layout>
      <BrowserRouter>
        <Routes>
          <Route index element={<AdminMainView />} />
          <Route path="/request/:id" element={<AdminRequestView />} />
        </Routes>
      </BrowserRouter>
    </Layout>
  </SWRConfig>
);

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});
