import { type Handler } from "../models/handler";
import { type ChangeEvent, useCallback, useState } from "react";
import { HTTP_METHODS } from "../lib/utils";
import { useImmer } from "use-immer";

export interface HandlerFormProps {
  initialValues?: Partial<Handler>;
  onChange: (v: Handler) => void;
  isLoading?: boolean;
}

export const HandlerForm = ({
  initialValues,
  onChange,
  isLoading,
}: HandlerFormProps) => {
  const [handler, setHandler] = useImmer<Partial<Handler>>({});

  const handleNameChange = useCallback(
    (v: string) => {
      setHandler((draft) => ({ ...draft, name: v }));
    },
    [setHandler]
  );
  const handlePathChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setHandler({ ...handler, path: e.target.value });
    },
    [setHandler, handler]
  );
  const handleMethodChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setHandler({ ...handler, method: e.target.value });
    },
    [setHandler, handler]
  );
  const handleCodeChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setHandler({ ...handler, code: e.target.value });
    },
    [setHandler, handler]
  );

  const handleSaveChanges = useCallback(() => {
    // TODO -- validation
    onChange(handler as Handler);
  }, [handler, onChange]);

  if (initialValues && handler !== initialValues) {
    setHandler(initialValues);
  }

  return null;

  // return isLoading ? (
  //   <Spinner />
  // ) : (
  //   <>
  //     <Section>
  //       <FormGroup label="Name">
  //         <InputGroup
  //           type="text"
  //           placeholder="Enter handler name..."
  //           value={handler?.name ?? ""}
  //           onValueChange={handleNameChange}
  //         />
  //       </FormGroup>
  //       <FormGroup label="Route">
  //         <ControlGroup>
  //           <HTMLSelect
  //             options={HTTP_METHODS}
  //             value={handler?.method ?? ""}
  //             onChange={handleMethodChange}
  //           />
  //           <InputGroup
  //             type="text"
  //             placeholder="e.g. /recipe/:id"
  //             value={handler?.path ?? ""}
  //             onChange={handlePathChange}
  //           />
  //         </ControlGroup>
  //       </FormGroup>
  //       <FormGroup label="Code">
  //         <TextArea
  //           className="mono"
  //           value={handler?.code ?? ""}
  //           onChange={handleCodeChange}
  //         />
  //       </FormGroup>
  //       <Button intent="primary" onClick={handleSaveChanges}>
  //         Save handler
  //       </Button>
  //     </Section>
  //   </>
  // );
};
