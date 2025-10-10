import Editor, { loader } from "@monaco-editor/react";

// Note -- I'm getting errors when using the useMonaco hook, so using loader init instead.
loader.init().then((monaco) => {
  // AIDEV-NOTE: These type declarations match what's available in the handler execution context
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare interface HandlerRequest {
      url: string;
      method: string;
      body?: any;
      params?: Record<string, string>;
      query: KVList<string>;
      headers: KVList<string>;
    }

    declare interface HandlerResponse {
      body?: any;
      headers: [string, string][];
      status: number;
    }

    declare interface KVPair<T> {
      key: string;
      value: T;
    }

    declare type KVList<T> = Array<KVPair<T>>;

    declare interface TLSInfo {
      protocol?: string | null;
      cipher?: {
        name?: string | null;
        standardName?: string | null;
        version?: string | null;
      } | null;
      isSessionReused?: boolean | null;
      peerCertificate?: {
        subject?: any;
        issuer?: any;
        valid_from?: string | null;
        valid_to?: string | null;
        fingerprint?: string | null;
      } | null;
    }

    declare interface RequestEvent {
      id: string;
      type: "inbound" | "outbound";
      status: "active" | "inactive" | "deleted";
      shared_id?: string | null;
      request_method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "CONNECT" | "TRACE";
      request_url: string;
      request_headers: KVList<string>;
      request_query_params: KVList<string>;
      request_body?: string | null;
      request_timestamp: string;
      response_status?: number | null;
      response_status_message?: string | null;
      response_headers?: KVList<string> | null;
      response_body?: string | null;
      response_timestamp?: string | null;
      tls_info?: TLSInfo | null;
    }

    declare interface JWTVerificationResult {
      isValid: boolean;
      error?: string;
      algorithm?: string;
      keyId?: string;
    }

    declare interface Context {
      requestEvent: RequestEvent;
      jwtVerification?: JWTVerificationResult | null;
    }

    // Console object available in handler code
    declare var console: {
      log: (...args: any[]) => void;
      debug: (...args: any[]) => void;
      info: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
    };

    // JWT utility functions
    declare var jwt: {
      isJWTVerified: () => boolean;
      getJWTPayload: () => Record<string, any> | null;
      getJWTClaims: () => Record<string, any> | null;
      getJWTAlgorithm: () => string | null;
      getJWTKeyId: () => string | null;
      requireJWTVerification: () => void;
    };

    // Handler execution context variables
    declare var req: HandlerRequest;
    declare var resp: HandlerResponse;
    declare var locals: Record<string, any>;
    declare var ctx: Context;

    // Promise-related helpers
    declare var Promise<T>: any; // placeholder
    declare var sleep: (ms: number) => Promise<void>;

    // Error classes available for throwing in handler code
    declare abstract class HandlerError extends Error {
      abstract readonly statusCode: number;
      constructor(message: string);
    }

    declare class BadRequestError extends HandlerError {
      readonly statusCode: 400;
    }

    declare class UnauthorizedError extends HandlerError {
      readonly statusCode: 401;
    }

    declare class ForbiddenError extends HandlerError {
      readonly statusCode: 403;
    }

    declare class NotFoundError extends HandlerError {
      readonly statusCode: 404;
    }

    declare class MethodNotAllowedError extends HandlerError {
      readonly statusCode: 405;
    }

    declare class PayloadTooLargeError extends HandlerError {
      readonly statusCode: 413;
    }

    declare class UnsupportedMediaTypeError extends HandlerError {
      readonly statusCode: 415;
    }

    declare class UnprocessableEntityError extends HandlerError {
      readonly statusCode: 422;
    }

    declare class TooManyRequestsError extends HandlerError {
      readonly statusCode: 429;
    }

    declare class InternalServerError extends HandlerError {
      readonly statusCode: 500;
    }

    declare class NotImplementedError extends HandlerError {
      readonly statusCode: 501;
    }

    declare class ServiceUnavailableError extends HandlerError {
      readonly statusCode: 503;
    }

    declare class GatewayTimeoutError extends HandlerError {
      readonly statusCode: 504;
    }
    `,
  );
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
  });
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
