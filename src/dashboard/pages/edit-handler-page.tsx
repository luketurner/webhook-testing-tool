import { useCallback } from "react";
import { useParams } from "react-router";
import { Link } from "react-router";
import { useResource, useResourceUpdater } from "../hooks";
import { HandlerForm } from "@/components/handler-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Handler } from "@/handlers/schema";

export const EditHandlerPage = () => {
  let { id } = useParams();

  const { data: handler, isLoading } = useResource<Handler>("handlers", id!);

  const { mutate } = useResourceUpdater("handlers", id!);

  const handleSaveChanges = useCallback(
    (resource: Handler) => {
      mutate(resource);
    },
    [handler, mutate],
  );

  return (
    <>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <HandlerForm
          key={id}
          initialValues={{
            ...handler,
            jku: handler.jku === null ? "" : handler.jku,
            jwks: handler.jwks === null ? "" : handler.jwks,
          }}
          onChange={handleSaveChanges}
          additionalButtons={
            <Button asChild variant="outline">
              <Link
                to={`/requests/new?method=${handler.method === "*" ? "GET" : handler.method}&path=${encodeURIComponent(handler.path)}`}
              >
                Test handler
              </Link>
            </Button>
          }
        />
      )}
    </>
  );
};
