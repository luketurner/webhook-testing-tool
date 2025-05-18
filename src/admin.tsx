import {
  Card,
  CardList,
  Divider,
  HTMLTable,
  Section,
  SectionCard,
  Spinner,
} from "@blueprintjs/core";
import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  redirect,
  Route,
  Routes,
  useParams,
} from "react-router";
import useSWR, { SWRConfig } from "swr";
import { WttRequest } from "./db";
import { headerNameDisplay } from "./utils";

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
  const { data: requests, isLoading } = useSWR<WttRequest[]>("/requests");
  return (
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
  const { data: request, isLoading } = useSWR<WttRequest>(`/requests/${id}`);
  const requestBody = atob(request?.req_body ?? "");
  const responseBody = atob(request?.resp_body ?? "");
  return (
    <Layout openRequest={id}>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <Section title="Request">
            <SectionCard>
              <HTMLTable compact striped>
                <tbody>
                  {Object.entries(request.req_headers ?? {}).map(([k, v]) => (
                    <tr>
                      <td>{headerNameDisplay(k)}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
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
                  {Object.entries(request.resp_headers ?? {}).map(([k, v]) => (
                    <tr>
                      <td>{headerNameDisplay(k)}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
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

const App = () => (
  <SWRConfig
    value={{
      fetcher: (resource, init) =>
        fetch("/api" + resource, init).then((res) => res.json()),
    }}
  >
    <BrowserRouter>
      <Routes>
        <Route index element={<AdminMainView />} />
        <Route path="/request/:id" element={<AdminRequestView />} />
      </Routes>
    </BrowserRouter>
  </SWRConfig>
);

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});
