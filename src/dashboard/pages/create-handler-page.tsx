import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { randomUUID } from "@/util/uuid";
import type { Handler } from "@/handlers/schema";
import { HandlerForm } from "@/components/handler-form";
import { useResourceCreator } from "../hooks";

export const CreateHandlerPage = () => {
  const { mutate } = useResourceCreator("handlers");
  const navigate = useNavigate();

  const id = useMemo(() => randomUUID(), []);

  const handleSaveChanges = useCallback(
    async (resource: Handler) => {
      await mutate(resource);
      navigate(`/handlers/${id}`);
    },
    [mutate],
  );

  return (
    <HandlerForm
      initialValues={{
        id,
        version_id: "1",
        name: "",
        method: "*",
        path: "",
        code: "resp.status = 200;\nresp.body = { status: 'ok' };",
      }}
      onChange={handleSaveChanges}
    />
  );
};
