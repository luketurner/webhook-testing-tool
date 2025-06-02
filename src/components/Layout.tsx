import React from "react";
import { type RequestEventMetadata } from "../models/request";
import { useResourceList, useSendDemoRequests } from "../hooks";
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

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: requests } = useResourceList<RequestEventMetadata>("requests");
  const { data: handlers } = useResourceList<HandlerMetadata>("handlers");
  const { trigger: handleSendDemoRequests } = useSendDemoRequests();
  const handleDownloadDatabase = React.useCallback(() => {
    window.location.href = "/api/db/export";
  }, []);
  return (
    <div className="max-w-4xl mx-auto">
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
            <MenubarItem onSelect={handleSendDemoRequests}>
              Send demo requests
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div className="grid justify-items-stretch">{children}</div>
    </div>
  );
};
