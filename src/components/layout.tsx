import React from "react";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { ManualSheet } from "@/components/manual-sheet";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger className="m-1" />
        <div className="max-w-6xl mx-auto p-4 w-full">
          <div className="grid justify-items-stretch">{children}</div>
        </div>
      </SidebarInset>
      <ManualSheet />
    </>
  );
};
