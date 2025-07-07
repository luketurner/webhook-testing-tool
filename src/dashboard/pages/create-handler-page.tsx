import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { randomUUID } from "@/util/uuid";
import type { Handler } from "@/handlers/schema";
import { HandlerForm } from "@/components/handler-form";
import { useResourceCreator } from "../hooks";
import { HTTP_METHODS } from "@/util/http";

export const CreateHandlerPage = () => {
  const { mutate } = useResourceCreator("handlers");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const id = useMemo(() => randomUUID(), []);

  const methodParam = searchParams.get("method");
  const validMethod =
    methodParam && [...HTTP_METHODS, "*"].includes(methodParam as any)
      ? (methodParam as Handler["method"])
      : "*";

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
        method: validMethod,
        path: searchParams.get("path") || "",
        code: "resp.status = 200;\nresp.body = { status: 'ok' };",
        jku: "",
        jwks: "",
      }}
      onChange={handleSaveChanges}
    />
  );
};
