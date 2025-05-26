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
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./ui/menubar";

// const RequestCard = ({ request, openRequest }) => {
//   const selected = request.id === openRequest;

//   const card = <Card selected={selected}>{request.id}</Card>;
//   return selected ? (
//     card
//   ) : (
//     <NavLink to={`/requests/${request.id}`}>{card}</NavLink>
//   );
// };

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
                Edit handler
              </MenubarSubTrigger>
              <MenubarSubContent>
                {handlers?.map((handler) => (
                  <MenubarLink to={`/handlers/${handler.id}`}>
                    {handler.name || "Unnamed handler"}
                  </MenubarLink>
                ))}
              </MenubarSubContent>
            </MenubarSub>
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
      {children}
    </div>
  );
};
