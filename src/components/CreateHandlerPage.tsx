import type { Handler } from "@/handlers/shared";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useResourceCreator } from "../hooks";
import { HandlerForm } from "./HandlerForm";
import { Layout } from "./Layout";

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
          code: "resp.status = 200;\nresp.body = { status: 'ok' };",
        }}
        onChange={handleSaveChanges}
      />
    </Layout>
  );
};
