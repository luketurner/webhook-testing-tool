import {
  Navbar,
  NavbarGroup,
  Alignment,
  NavbarHeading,
  Button,
  NavbarDivider,
  Popover,
  MenuItem,
  Section,
  CardList,
  Spinner,
  Menu,
  Card,
} from "@blueprintjs/core";
import React from "react";
import useSWR from "swr";
import { NavLink } from "react-router";
import { RequestEventMetadata } from "../models/request";

const RequestCard = ({ request, openRequest }) => {
  const selected = request.id === openRequest;

  const card = <Card selected={selected}>{request.id}</Card>;
  return selected ? (
    card
  ) : (
    <NavLink to={`/requests/${request.id}`}>{card}</NavLink>
  );
};

export const Layout = ({
  openRequest,
  children,
}: {
  openRequest?: string;
  children: React.ReactNode;
}) => {
  const { data: requests } = useResourceList<RequestEventMetadata>("requests");
  const { data: handlers } = useResourceList<handlerMetadata>("handlers");
  const handleDownloadDatabase = React.useCallback(() => {
    window.location.href = "/api/db/export";
  }, []);
  return (
    <div>
      <Navbar>
        <NavbarGroup align={Alignment.START}>
          <NavbarHeading>
            <NavLink to="/">
              <Button variant="minimal" text="Webhook Testing Tool" />
            </NavLink>
          </NavbarHeading>
          <NavbarDivider />
          <Popover
            content={
              <Menu>
                <NavLink to="/handlers/create">
                  <MenuItem text="New handler" />
                </NavLink>
                <MenuItem text="Edit handler" disabled={handlers?.length < 1}>
                  {handlers?.map((handler) => (
                    <NavLink to={`/handlers/${handler.id}`}>
                      <MenuItem text={handler.id} />
                    </NavLink>
                  ))}
                </MenuItem>
              </Menu>
            }
            placement="bottom-start"
            minimal
          >
            <Button variant="minimal" text="Handlers" />
          </Popover>
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
            <Button variant="minimal" text="Tools" />
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
