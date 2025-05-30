import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect } from "react";
import { loader } from "@monaco-editor/react";

// Note -- I'm getting errors when using the useMonaco hook, so using loader init instead.
loader.init().then((monaco) => {
  // TODO -- Proper types
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare interface Request {
      url: string;
      method: string;
      body?: string;
      params?: Record<string, string>;
      query?: Record<string, string>;
    }

    declare interface Response {
      body?: string;
      headers: Record<string, string>;
      status: number;
    }
    `
  );
});

export interface CodeEditorProps {
  onChange: (value: string) => void;
  defaultValue?: string;
  value?: string;
}

export function CodeEditor({ onChange, defaultValue, value }: CodeEditorProps) {
  return (
    <Editor
      defaultLanguage="typescript"
      height="300px"
      value={value}
      defaultValue={defaultValue ?? ""}
      onChange={onChange}
    />
  );
}
