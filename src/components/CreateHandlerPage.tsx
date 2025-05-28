import { Layout } from "./Layout";
import { useCallback, useMemo } from "react";
import { useResourceCreator } from "../hooks";
import { HandlerForm } from "./HandlerForm";
import { type Handler } from "../models/handler";
import { useNavigate } from "react-router";

export const CreateHandlerPage = () => {
  const { trigger } = useResourceCreator("handlers");
  const navigate = useNavigate();

  const id = useMemo(() => crypto.randomUUID(), []);

  const handleSaveChanges = useCallback(
    async (resource: Handler) => {
      await trigger({ resource });
      navigate(`/handlers/${id}`);
    },
    [trigger]
  );

  return (
    <Layout>
      <HandlerForm
        initialValues={{
          id,
          versionId: "1",
          order: 1,
          name: "",
          method: "*",
          path: "",
          code: "",
        }}
        onChange={handleSaveChanges}
      />
    </Layout>
  );
};
