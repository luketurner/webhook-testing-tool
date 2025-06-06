import { useParams } from "react-router";
import { Layout } from "./Layout";
import { type Handler } from "../models/handler";
import { useCallback } from "react";
import { useResource, useResourceUpdater } from "../hooks";
import { HandlerForm } from "./HandlerForm";
import { Skeleton } from "./ui/skeleton";

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
