import { useParams } from "react-router";
import { Layout } from "./Layout";
import { Handler } from "../models/handler";
import { useCallback } from "react";
import { useResource, useResourceUpdater } from "../hooks";
import { HandlerForm } from "./HandlerForm";

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
      <HandlerForm
        isLoading={isLoading}
        initialValues={handler}
        onChange={handleSaveChanges}
      />
    </Layout>
  );
};
