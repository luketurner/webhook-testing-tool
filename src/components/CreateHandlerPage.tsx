import { Layout } from "./Layout";
import { useCallback } from "react";
import { useResourceCreator } from "../hooks";
import { HandlerForm } from "./HandlerForm";
import { type Handler } from "../models/handler";

export const CreateHandlerPage = () => {
  const { trigger } = useResourceCreator("handlers");

  const id = crypto.randomUUID();

  const handleSaveChanges = useCallback(
    (resource: Handler) => {
      trigger({ resource });
    },
    [trigger]
  );

  return (
    <Layout>
      <HandlerForm
        initialValues={{ id, versionId: "1" }}
        onChange={handleSaveChanges}
      />
    </Layout>
  );
};
