import Editor, { loader } from "@monaco-editor/react";

// Note -- I'm getting errors when using the useMonaco hook, so using loader init instead.
loader.init().then((monaco) => {
  // TODO -- Proper types
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare interface HandlerRequest {
      url: string;
      method: string;
      body?: string;
      params?: [string, string][];
      query?: Record<string, string>;
    }

    declare interface HandlerResponse {
      body?: any;
      headers: [string, string][];
      status: number;
    }

    declare interface Context {
      requestEvent: Record<string, any>; // TODO
    }

    declare var req: HandlerRequest;
    declare var resp: HandlerResponse;
    declare var locals: Record<string, any>;
    declare var ctx: Context
    `,
  );
});

export interface CodeEditorProps {
  onChange: (value: string) => void;
  defaultValue?: string;
  value?: string;
  defaultLanguage?: string;
}

export function CodeEditor({
  onChange,
  defaultValue,
  value,
  defaultLanguage,
}: CodeEditorProps) {
  return (
    <Editor
      defaultLanguage={defaultLanguage ?? "typescript"}
      height="300px"
      value={value}
      defaultValue={defaultValue ?? ""}
      onChange={onChange}
      options={{
        minimap: {
          enabled: false,
        },
      }}
    />
  );
}
