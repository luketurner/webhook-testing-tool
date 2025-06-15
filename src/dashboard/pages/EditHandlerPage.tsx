import { useCallback } from "react";
import { useParams } from "react-router";
import { useResource, useResourceUpdater } from "../hooks";
import { HandlerForm } from "@/components/HandlerForm";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import type { Handler } from "@/handlers/schema";

export const EditHandlerPage = () => {
  let { id } = useParams();

  const { data: handler, isLoading } = useResource<Handler>("handlers", id!);

  const { trigger } = useResourceUpdater("handlers", id!);

  const handleSaveChanges = useCallback(
    (resource: Handler) => {
      trigger({ resource });
    },
    [handler, trigger]
  );

  return (
    <Layout>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <HandlerForm initialValues={handler} onChange={handleSaveChanges} />
      )}
    </Layout>
  );
};
