import {
  Activity,
  Webhook,
  Settings,
  Cog,
  BookOpen,
  User,
  Network,
} from "lucide-react";
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useSendRequest } from "@/dashboard/hooks";
import { Link, useSearchParams } from "react-router";
import { RequestSidebar } from "@/components/request-sidebar";
import { HandlerSidebar } from "@/components/handler-sidebar";
import { TcpConnectionsSidebar } from "@/components/tcp-connections-sidebar";
import { JWTInspector } from "@/components/jwt-inspector";
import { seedRequests } from "@/util/seed";
import { useQueryClient } from "@tanstack/react-query";

const navMain = [
  {
    title: "Requests",
    icon: Activity,
  },
  {
    title: "Handlers",
    icon: Settings,
  },
  {
    title: "TCP Connections",
    icon: Network,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = React.useState(navMain[0]);
  const { setOpen, open } = useSidebar();
  const { mutate: handleSendRequest } = useSendRequest();
  const [showJWTInspector, setShowJWTInspector] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const handleDownloadDatabase = React.useCallback(() => {
    window.location.href = "/api/db/export";
  }, []);

  const handleOpenManual = React.useCallback(
    (page: string = "home") => {
      searchParams.set("manual", page);
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams],
  );

  const handleTestTcpConnection = React.useCallback(async () => {
    try {
      const response = await fetch("/api/tcp-connections/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
    } catch (error) {
      console.error("TCP test connection error:", error);
    }
  }, []);

  const handleSignOut = React.useCallback(async () => {
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Invalidate session query to trigger re-fetch
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        // The SessionProvider will handle showing the login form
      }
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [queryClient]);

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
                        setOpen(
                          open && activeItem?.title === item.title
                            ? false
                            : true,
                        );
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        tooltip={{
                          children: "Tools",
                          hidden: false,
                        }}
                        className="px-2.5 md:px-2"
                      >
                        <Cog />
                        <span>Tools</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          Send test request...
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onSelect={() => {
                              seedRequests.forEach((request) => {
                                handleSendRequest(request);
                              });
                            }}
                          >
                            Send all test requests
                          </DropdownMenuItem>
                          {seedRequests.map((request) => (
                            <DropdownMenuItem
                              key={request.id}
                              onSelect={() => handleSendRequest(request)}
                            >
                              {request.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onSelect={handleDownloadDatabase}>
                        Export database as SQLite
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setShowJWTInspector(true)}
                      >
                        JWT Inspector
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleTestTcpConnection}>
                        Test TCP connection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        tooltip={{
                          children: "Documentation",
                          hidden: false,
                        }}
                        className="px-2.5 md:px-2"
                      >
                        <BookOpen />
                        <span>Documentation</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem
                        onSelect={() => handleOpenManual("home")}
                      >
                        About
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleOpenManual("handlers")}
                      >
                        Handlers
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={{
                      children: "User Menu",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                  >
                    <User />
                    <span>User</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end">
                  <DropdownMenuItem onSelect={handleSignOut}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      {activeItem?.title === "Requests" ? (
        <RequestSidebar />
      ) : activeItem?.title === "Handlers" ? (
        <HandlerSidebar />
      ) : (
        <TcpConnectionsSidebar />
      )}

      <JWTInspector
        open={showJWTInspector}
        onOpenChange={setShowJWTInspector}
      />
    </Sidebar>
  );
}
