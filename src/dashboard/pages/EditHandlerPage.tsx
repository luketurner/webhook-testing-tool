import { useCallback } from "react";
import { useParams } from "react-router";
import { useResource, useResourceUpdater } from "../hooks";
import { HandlerForm } from "@/components/HandlerForm";
import { Skeleton } from "@/components/ui/skeleton";
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
          initialValues={handler}
          onChange={handleSaveChanges}
        />
      )}
    </>
  );
};
