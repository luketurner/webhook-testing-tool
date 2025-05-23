import {
  Spinner,
  Section,
  FormGroup,
  InputGroup,
  ControlGroup,
  HTMLSelect,
  TextArea,
  Button,
} from "@blueprintjs/core";
import { useParams } from "react-router";
import useSWR from "swr";
import { Layout } from "./Layout";
import { Handler } from "../models/handler";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

const methods = [
  "*",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
];

export const HandlerPage = () => {
  const { id } = useParams();
  const { data: existingHandler, isLoading } =
    id === "create"
      ? { data: undefined, isLoading: false }
      : useSWR<Handler>(`/handlers/${id}`);

  const [handler, setHandler] = useState<Handler | null>(null);

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setHandler({ ...handler, name: e.target.value });
    },
    [handler]
  );
  const handlePathChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setHandler({ ...handler, path: e.target.value });
    },
    [handler]
  );
  const handleMethodChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setHandler({ ...handler, method: e.target.value });
    },
    [handler]
  );
  const handleCodeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setHandler({ ...handler, code: e.target.value });
    },
    [handler]
  );
  const handleSaveChanges = useCallback(() => {
    // TODO -- mutation
  }, [handler]);

  if (id === "create" && handler === null) {
    setHandler({} as Handler); // TODO
  }

  if (existingHandler && handler === null) {
    setHandler(existingHandler);
  }

  return (
    <Layout>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <Section>
            <FormGroup label="Name">
              <InputGroup
                type="text"
                placeholder="Enter handler name..."
                value={handler?.name}
                onChange={handleNameChange}
              />
            </FormGroup>
            <FormGroup label="Route">
              <ControlGroup>
                <HTMLSelect
                  options={methods}
                  value={handler?.method}
                  onChange={handleMethodChange}
                />
                <InputGroup
                  type="text"
                  placeholder="e.g. /recipe/:id"
                  value={handler?.path}
                  onChange={handlePathChange}
                />
              </ControlGroup>
            </FormGroup>
            <FormGroup label="Code">
              <TextArea
                className="mono"
                value={handler?.code}
                onChange={handleCodeChange}
              />
            </FormGroup>
            <Button intent="primary" onClick={handleSaveChanges}>
              Save handler
            </Button>
          </Section>
        </>
      )}
    </Layout>
  );
};
