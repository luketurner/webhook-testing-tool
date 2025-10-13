import Editor, { loader } from "@monaco-editor/react";

// AIDEV-NOTE: TCP handler code editor with type declarations for the TCP execution context
loader.init().then((monaco) => {
  // Type declarations for TCP handler execution context
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    // Console object available in TCP handler code
    declare var console: {
      log: (...args: any[]) => void;
      debug: (...args: any[]) => void;
      info: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
    };

    // TCP handler execution context variables
    declare var data: string; // Incoming TCP data as a string
    declare function send(data: string): void; // Send data back to the TCP client

    // Shared state object (shared across all TCP handler executions)
    declare var shared: Record<string, any>;

    // Promise-related helpers
    declare var Promise<T>: any; // placeholder
    declare var sleep: (ms: number) => Promise<void>;

    // Base64 encoding/decoding functions
    declare function btoa(data: string): string;
    declare function atob(data: string): string;
    `,
  );
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
  });
});

export interface TcpCodeEditorProps {
  onChange: (value: string) => void;
  defaultValue?: string;
  value?: string;
  defaultLanguage?: string;
}

export function TcpCodeEditor({
  onChange,
  defaultValue,
  value,
  defaultLanguage,
}: TcpCodeEditorProps) {
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
