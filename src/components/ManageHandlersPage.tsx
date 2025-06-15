import { useCallback } from "react";
import { NavLink } from "react-router";
import { useResourceDeleter, useResourceList } from "../hooks";
import { Layout } from "./Layout";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import type { Handler } from "@/handlers/schema";

const HandlerRow = ({ handler }: { handler: Handler }) => {
  const { trigger } = useResourceDeleter("handlers", handler.id);

  const handleDelete = useCallback(() => {
    trigger();
  }, [trigger]);

  return (
    <TableRow key={handler.id}>
      <TableCell>{handler.method} </TableCell>
      <TableCell>{handler.path}</TableCell>
      <TableCell>
        <Button className="float-right" variant="outline" asChild>
          <NavLink to={`/handlers/${handler.id}`}>Open</NavLink>
        </Button>
        <Button
          className="float-right"
          variant="destructive"
          onClick={handleDelete}
        >
          X
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const ManageHandlersPage = () => {
  const { data: handlers, isLoading } = useResourceList<Handler>("handlers");

  return (
    <Layout>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <Table className="min-w-xl max-w-3xl m-4">
          <TableBody>
            {handlers.map((handler) => (
              <HandlerRow handler={handler} key={handler.id} />
            ))}
          </TableBody>
        </Table>
      )}
    </Layout>
  );
};
