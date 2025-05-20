import {
  Alignment,
  Button,
  Card,
  CardList,
  Divider,
  HTMLTable,
  Menu,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  OverlaysProvider,
  Popover,
  Section,
  SectionCard,
  Spinner,
} from "@blueprintjs/core";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes, useParams } from "react-router";
import useSWR, { SWRConfig } from "swr";
import { headerNameDisplay } from "./utils";
import { RequestEventClient, RequestEventMetadata } from "./models/request";

const RequestCard = ({ request, openRequest }) => {
  const selected = request.id === openRequest;

  const card = <Card selected={selected}>{request.id}</Card>;
  return selected ? (
    card
  ) : (
    <NavLink to={`/request/${request.id}`}>{card}</NavLink>
  );
};

const Layout = ({
  openRequest,
  children,
}: {
  openRequest?: string;
  children: React.ReactNode;
}) => {
  const { data: requests } = useSWR<RequestEventMetadata[]>("/requests");
  const handleDownloadDatabase = React.useCallback(() => {
    window.location.href = "/api/db/export";
  }, []);
  return (
    <div>
      <Navbar>
        <NavbarGroup align={Alignment.START}>
          <NavbarHeading>Webhook Testing Tool</NavbarHeading>
          <NavbarDivider />
          <Popover
            content={
              <Menu>
                <MenuItem
                  onClick={handleDownloadDatabase}
                  text="Export database: SQLite"
                  icon="cloud-download"
                />
              </Menu>
            }
            placement="bottom-start"
            minimal
          >
            <Button className="bp5-minimal" text="Tools" />
          </Popover>
        </NavbarGroup>
      </Navbar>
      <div style={{ display: "flex" }}>
        <Section title="Requests">
          <CardList>
            {requests ? (
              requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  openRequest={openRequest}
                />
              ))
            ) : (
              <Spinner />
            )}
          </CardList>
        </Section>
        {children}
      </div>
    </div>
  );
};

const AdminMainView = () => {
  return (
    <Layout>
      <p>Home page</p>
    </Layout>
  );
};

const AdminRequestView = () => {
  const { id } = useParams();
  const { data: request, isLoading } = useSWR<RequestEventClient>(
    `/requests/${id}`
  );
  const requestBody = atob(request?.request?.body ?? "");
  const responseBody = atob(request?.response?.body ?? "");
  return (
    <Layout openRequest={id}>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <Section title="Request">
            <SectionCard>
              {request?.request?.method} {request?.request?.url}
            </SectionCard>
            <SectionCard>
              <HTMLTable compact striped>
                <tbody>
                  {Object.entries(request?.request?.headers ?? {}).map(
                    ([k, v]) => (
                      <tr>
                        <td>{headerNameDisplay(k)}</td>
                        <td>{v}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </HTMLTable>
            </SectionCard>
            {requestBody ? (
              <SectionCard>
                <pre className="bp5-code-block">
                  <code>{requestBody}</code>
                </pre>
              </SectionCard>
            ) : null}
          </Section>
          <Section title="Response">
            <SectionCard>
              <HTMLTable compact striped>
                <tbody>
                  {Object.entries(request?.response?.headers ?? {}).map(
                    ([k, v]) => (
                      <tr>
                        <td>{headerNameDisplay(k)}</td>
                        <td>{v}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </HTMLTable>
            </SectionCard>
            {responseBody ? (
              <SectionCard>
                <pre className="bp5-code-block">
                  <code>{responseBody}</code>
                </pre>
              </SectionCard>
            ) : null}
          </Section>
        </>
      )}
    </Layout>
  );
};

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
          <Route index element={<AdminMainView />} />
          <Route path="/request/:id" element={<AdminRequestView />} />
        </Routes>
      </BrowserRouter>
    </OverlaysProvider>
  </SWRConfig>
);

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});
