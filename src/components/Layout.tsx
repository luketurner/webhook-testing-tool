import React from "react";
import { useResourceList, useSendDemoRequests } from "../dashboard/hooks";
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
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { RequestEventMeta } from "@/request-events/schema";
import type { Handler } from "@/handlers/schema";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: requests } = useResourceList<RequestEventMeta>("requests");
  const { data: handlers } = useResourceList<Handler>("handlers");
  const { trigger: handleSendDemoRequests } = useSendDemoRequests();
  const handleDownloadDatabase = React.useCallback(() => {
    window.location.href = "/api/db/export";
  }, []);
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Menubar className="border-none">
          <SidebarTrigger />
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
                    <MenubarLink
                      key={request.id}
                      to={`/requests/${request.id}`}
                    >
                      {request.request_url}
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
                    <MenubarLink
                      key={handler.id}
                      to={`/handlers/${handler.id}`}
                    >
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
        <main className="max-w-4xl mx-auto p-4 w-full">
          <div className="grid justify-items-stretch">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
};
