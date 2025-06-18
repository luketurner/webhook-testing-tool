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
        <SidebarTrigger className="m-1" />
        <main className="max-w-4xl mx-auto p-4 w-full">
          <div className="grid justify-items-stretch">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
};
