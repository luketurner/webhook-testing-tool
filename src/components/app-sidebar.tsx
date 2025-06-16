import { Activity, Webhook } from "lucide-react";
import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceList } from "@/dashboard/hooks";
import type { RequestEventMeta } from "@/request-events/schema";
import { Link, NavLink } from "react-router";

const navMain = [
  {
    title: "Requests",
    url: "#",
    icon: Activity,
    isActive: true,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = React.useState(navMain[0]);
  const { data: requests, isLoading } =
    useResourceList<RequestEventMeta>("requests");
  const { setOpen } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <Link to="/">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Webhook className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      Webhook Testing Tool
                    </span>
                    <span className="truncate text-xs">WTT</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item);
                        setOpen(true);
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 border-b p-4 last:border-b-0"
                    >
                      <div className="flex w-full items-center gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="ml-auto h-3 w-12" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    </div>
                  ))
                : requests?.map((request) => {
                    const statusColor =
                      request.status === "complete"
                        ? "text-green-600"
                        : request.status === "error"
                          ? "text-red-600"
                          : "text-yellow-600";
                    const date = new Date(
                      request.request_timestamp
                    ).toLocaleString();

                    return (
                      <NavLink
                        to={`/requests/${request.id}`}
                        key={request.id}
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className={`font-medium ${statusColor}`}>
                            {request.request_method}
                          </span>
                          <span className="ml-auto text-xs">{date}</span>
                        </div>
                        <span className="font-medium truncate w-full">
                          {request.request_url}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`capitalize ${statusColor}`}>
                            {request.status}
                          </span>
                          {request.response_status && (
                            <span className="text-muted-foreground">
                              • {request.response_status}
                            </span>
                          )}
                        </div>
                      </NavLink>
                    );
                  })}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
