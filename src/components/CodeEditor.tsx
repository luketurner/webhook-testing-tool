import Editor from "@monaco-editor/react";

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
