import React from "react";
import { NavLink } from "react-router";
import { type RequestEventMetadata } from "../models/request";
import { useResourceList } from "../hooks";
import { type HandlerMetadata } from "../models/handler";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLink,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./ui/menubar";

export const Layout = ({
  openRequest,
  children,
}: {
  openRequest?: string;
  children: React.ReactNode;
}) => {
  const { data: requests } = useResourceList<RequestEventMetadata>("requests");
  const { data: handlers } = useResourceList<HandlerMetadata>("handlers");
  const handleDownloadDatabase = React.useCallback(() => {
    window.location.href = "/api/db/export";
  }, []);
  return (
    <div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Requests</MenubarTrigger>
          <MenubarContent>
            <MenubarLink to="/requests/new">New request</MenubarLink>
            <MenubarSub>
              <MenubarSubTrigger disabled={!requests?.length}>
                Open request
              </MenubarSubTrigger>
              <MenubarSubContent>
                {requests?.map((request) => (
                  <MenubarLink to={`/requests/${request.id}`}>
                    {request.request.url}
                  </MenubarLink>
                ))}
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Handlers</MenubarTrigger>
          <MenubarContent>
            <MenubarLink to="/handlers/new">New handler</MenubarLink>
            <MenubarSub>
              <MenubarSubTrigger disabled={!handlers?.length}>
                Open handler
              </MenubarSubTrigger>
              <MenubarSubContent>
                {handlers?.map((handler) => (
                  <MenubarLink to={`/handlers/${handler.id}`}>
                    {handler.name || "Unnamed handler"}
                  </MenubarLink>
                ))}
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarLink to="/handlers">Manage handlers</MenubarLink>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={handleDownloadDatabase}>
              Export database (SQLite)
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div className="grid justify-items-center">{children}</div>
    </div>
  );
};
