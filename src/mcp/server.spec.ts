import { describe, test, expect } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import * as jose from "jose";
import { createMcpServer } from "./server";
import {
  createRequestEvent,
  deleteRequestEvent,
  getAllRequestEventsMeta,
  getRequestEvent,
} from "@/request-events/model";
import { TEST_PORT } from "@/test-config";
import { parseBase64 } from "@/util/base64";
import { createHandlerExecution } from "@/handler-executions/model";
import {
  createTcpConnection,
  deleteTcpConnection,
  getTcpConnection,
} from "@/tcp-connections/model";
import { createHandler, getAllHandlers, getHandler } from "@/handlers/model";
import type { RequestEvent } from "@/request-events/schema";
import type { TcpConnection } from "@/tcp-connections/schema";
import type { Handler } from "@/handlers/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";

async function connectClient(): Promise<Client> {
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const server = createMcpServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ isError: boolean; text: string }> {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as { type: string; text: string }[];
  return { isError: result.isError === true, text: content[0]?.text ?? "" };
}

function makeRequestEvent(): RequestEvent {
  return {
    id: randomUUID(),
    type: "inbound",
    status: "complete",
    request_method: "POST",
    request_url: "/webhook",
    request_headers: [["Content-Type", "application/json"]],
    request_query_params: [],
    request_timestamp: now(),
  };
}

function makeTcpConnection(): TcpConnection {
  return {
    id: randomUUID(),
    client_ip: "127.0.0.1",
    client_port: 50000,
    server_ip: "127.0.0.1",
    server_port: 3002,
    status: "closed",
    open_timestamp: now(),
  };
}

function makeHandler(): Handler {
  return {
    id: randomUUID(),
    version_id: "1",
    name: "Test handler",
    code: "resp.status = 200;",
    path: "/webhook",
    method: "*",
    order: 0,
  };
}

describe("mcp/server", () => {
  test("tools/list exposes all 16 tools", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "send-http-request",
        "list-http-requests",
        "get-http-request",
        "archive-http-request",
        "list-tcp-connections",
        "get-tcp-connection",
        "archive-tcp-connection",
        "list-handlers",
        "get-handler",
        "create-handler",
        "update-handler",
        "delete-handler",
        "inspect-jwt",
        "verify-jwt",
        "list-manual-pages",
        "get-manual-page",
      ].sort(),
    );
  });

  describe("http request tools", () => {
    test("list-http-requests returns metadata without payloads", async () => {
      const event = createRequestEvent(makeRequestEvent());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "list-http-requests");
      expect(isError).toBe(false);
      const list = JSON.parse(text);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(event.id);
      expect(list[0].request_headers).toBeUndefined();
      expect(list[0].request_body).toBeUndefined();
    });

    test("list-http-requests excludes archived unless requested", async () => {
      createRequestEvent(makeRequestEvent());
      const archived = createRequestEvent(makeRequestEvent());
      const client = await connectClient();
      await callTool(client, "archive-http-request", { id: archived.id });

      const defaultList = JSON.parse(
        (await callTool(client, "list-http-requests")).text,
      );
      expect(defaultList).toHaveLength(1);

      const fullList = JSON.parse(
        (
          await callTool(client, "list-http-requests", {
            include_archived: true,
          })
        ).text,
      );
      expect(fullList).toHaveLength(2);

      // resetDb() leaves archived rows behind; clean up explicitly
      deleteRequestEvent(archived.id);
    });

    test("get-http-request returns full event with handler executions", async () => {
      const event = createRequestEvent(makeRequestEvent());
      const execution = createHandlerExecution({
        id: randomUUID(),
        handler_id: randomUUID(),
        request_event_id: event.id,
        order: 0,
        timestamp: now(),
        status: "success",
      });
      const client = await connectClient();

      const { isError, text } = await callTool(client, "get-http-request", {
        id: event.id,
      });
      expect(isError).toBe(false);
      const data = JSON.parse(text);
      expect(data.request.id).toBe(event.id);
      expect(data.request.request_headers).toEqual([
        ["Content-Type", "application/json"],
      ]);
      expect(data.handler_executions).toHaveLength(1);
      expect(data.handler_executions[0].id).toBe(execution.id);
    });

    test("get-http-request returns error for unknown id", async () => {
      const client = await connectClient();
      const { isError } = await callTool(client, "get-http-request", {
        id: randomUUID(),
      });
      expect(isError).toBe(true);
    });

    test("get-http-request rejects invalid uuid input", async () => {
      const client = await connectClient();
      const { isError, text } = await callTool(client, "get-http-request", {
        id: "not-a-uuid",
      });
      expect(isError).toBe(true);
      expect(text).toContain("Input validation error");
    });

    test("archive-http-request sets the archived timestamp", async () => {
      const event = createRequestEvent(makeRequestEvent());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "archive-http-request", {
        id: event.id,
      });
      expect(isError).toBe(false);
      expect(JSON.parse(text).archived_timestamp).toBeNumber();
      expect(getRequestEvent(event.id).archived_timestamp).toBeNumber();

      // resetDb() leaves archived rows behind; clean up explicitly
      deleteRequestEvent(event.id);
    });

    test("send-http-request sends a request that gets captured", async () => {
      const client = await connectClient();

      const { isError, text } = await callTool(client, "send-http-request", {
        method: "POST",
        // Absolute URL targeting the webhook server started by test-setup
        url: `http://localhost:${TEST_PORT}/mcp-send-test`,
        headers: [["Content-Type", "application/json"]],
        query: [["source", "mcp"]],
        body: parseBase64(
          Buffer.from(JSON.stringify({ hello: "mcp" })).toString("base64"),
        ),
      });
      expect(isError).toBe(false);
      const response = JSON.parse(text);
      expect(response.status).toBe(200);

      const captured = getAllRequestEventsMeta().find((event) =>
        event.request_url.includes("/mcp-send-test"),
      );
      expect(captured).toBeDefined();
      expect(captured!.request_method).toBe("POST");
    });

    test("send-http-request surfaces connection errors as tool errors", async () => {
      const client = await connectClient();

      const { isError } = await callTool(client, "send-http-request", {
        method: "GET",
        // Discard port: nothing listens here
        url: "http://localhost:9/unreachable",
      });
      expect(isError).toBe(true);
    });
  });

  describe("tcp connection tools", () => {
    test("list-tcp-connections returns metadata without data fields", async () => {
      const connection = createTcpConnection(makeTcpConnection());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "list-tcp-connections");
      expect(isError).toBe(false);
      const list = JSON.parse(text);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(connection.id);
      expect(list[0].received_data).toBeUndefined();
    });

    test("get-tcp-connection returns the full connection", async () => {
      const connection = createTcpConnection(makeTcpConnection());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "get-tcp-connection", {
        id: connection.id,
      });
      expect(isError).toBe(false);
      expect(JSON.parse(text).client_ip).toBe("127.0.0.1");
    });

    test("get-tcp-connection returns error for unknown id", async () => {
      const client = await connectClient();
      const { isError, text } = await callTool(client, "get-tcp-connection", {
        id: randomUUID(),
      });
      expect(isError).toBe(true);
      expect(text).toContain("not found");
    });

    test("archive-tcp-connection archives the connection", async () => {
      const connection = createTcpConnection(makeTcpConnection());
      const client = await connectClient();

      const { isError } = await callTool(client, "archive-tcp-connection", {
        id: connection.id,
      });
      expect(isError).toBe(false);
      expect(getTcpConnection(connection.id)?.archived_timestamp).toBeNumber();

      // resetDb() leaves archived rows behind; clean up explicitly
      deleteTcpConnection(connection.id);
    });
  });

  describe("handler tools", () => {
    test("list-handlers returns metadata without code", async () => {
      const handler = createHandler(makeHandler());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "list-handlers");
      expect(isError).toBe(false);
      const list = JSON.parse(text);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(handler.id);
      expect(list[0].code).toBeUndefined();
    });

    test("get-handler returns the handler with code", async () => {
      const handler = createHandler(makeHandler());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "get-handler", {
        id: handler.id,
      });
      expect(isError).toBe(false);
      expect(JSON.parse(text).code).toBe("resp.status = 200;");
    });

    test("create-handler assigns id and next order automatically", async () => {
      createHandler({ ...makeHandler(), order: 5 });
      const client = await connectClient();

      const { isError, text } = await callTool(client, "create-handler", {
        name: "Created via MCP",
        code: "resp.body = 'hi';",
        path: "/mcp-created",
        method: "POST",
      });
      expect(isError).toBe(false);
      const created = JSON.parse(text);
      expect(created.order).toBe(6);
      expect(getHandler(created.id).name).toBe("Created via MCP");
    });

    test("update-handler only changes provided fields", async () => {
      const handler = createHandler(makeHandler());
      const client = await connectClient();

      const { isError, text } = await callTool(client, "update-handler", {
        id: handler.id,
        name: "Renamed",
      });
      expect(isError).toBe(false);
      const updated = JSON.parse(text);
      expect(updated.name).toBe("Renamed");
      expect(updated.code).toBe(handler.code);
      expect(updated.path).toBe(handler.path);
    });

    test("update-handler returns error for unknown id", async () => {
      const client = await connectClient();
      const { isError } = await callTool(client, "update-handler", {
        id: randomUUID(),
        name: "Renamed",
      });
      expect(isError).toBe(true);
    });

    test("delete-handler removes the handler", async () => {
      const handler = createHandler(makeHandler());
      const client = await connectClient();

      const { isError } = await callTool(client, "delete-handler", {
        id: handler.id,
      });
      expect(isError).toBe(false);
      expect(getAllHandlers()).toHaveLength(0);
    });
  });

  describe("jwt tools", () => {
    const secret = "test-secret-value";

    async function makeToken(
      key: jose.CryptoKey | Uint8Array,
      alg: string,
      claims: Record<string, unknown> = {},
    ): Promise<string> {
      return new jose.SignJWT({ sub: "user-1", ...claims })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(key);
    }

    test("inspect-jwt decodes header and payload", async () => {
      const token = await makeToken(new TextEncoder().encode(secret), "HS256");
      const client = await connectClient();

      const { isError, text } = await callTool(client, "inspect-jwt", {
        token,
      });
      expect(isError).toBe(false);
      const data = JSON.parse(text);
      expect(data.isValid).toBe(true);
      expect(data.headers.alg).toBe("HS256");
      expect(data.payload.sub).toBe("user-1");
    });

    test("inspect-jwt accepts a Bearer prefix", async () => {
      const token = await makeToken(new TextEncoder().encode(secret), "HS256");
      const client = await connectClient();

      const { isError, text } = await callTool(client, "inspect-jwt", {
        token: `Bearer ${token}`,
      });
      expect(isError).toBe(false);
      expect(JSON.parse(text).payload.sub).toBe("user-1");
    });

    test("inspect-jwt returns error for a non-JWT", async () => {
      const client = await connectClient();
      const { isError } = await callTool(client, "inspect-jwt", {
        token: "not a jwt",
      });
      expect(isError).toBe(true);
    });

    test("verify-jwt validates an HMAC-signed token", async () => {
      const token = await makeToken(new TextEncoder().encode(secret), "HS256");
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", {
        token,
        key: secret,
      });
      expect(JSON.parse(text).isValid).toBe(true);
    });

    test("verify-jwt rejects a wrong HMAC secret", async () => {
      const token = await makeToken(new TextEncoder().encode(secret), "HS256");
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", {
        token,
        key: "wrong-secret",
      });
      const result = JSON.parse(text);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("signature");
    });

    test("verify-jwt rejects an expired token", async () => {
      const token = await new jose.SignJWT({ sub: "user-1" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 300)
        .sign(new TextEncoder().encode(secret));
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", {
        token,
        key: secret,
      });
      const result = JSON.parse(text);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("expired");
    });

    test("verify-jwt validates with a public key PEM", async () => {
      const { publicKey, privateKey } = await jose.generateKeyPair("RS256", {
        extractable: true,
      });
      const token = await makeToken(privateKey, "RS256");
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", {
        token,
        key: await jose.exportSPKI(publicKey),
      });
      expect(JSON.parse(text).isValid).toBe(true);
    });

    test("verify-jwt derives the public key from a private key PEM", async () => {
      const { privateKey } = await jose.generateKeyPair("ES256", {
        extractable: true,
      });
      const token = await makeToken(privateKey, "ES256");
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", {
        token,
        key: await jose.exportPKCS8(privateKey),
      });
      expect(JSON.parse(text).isValid).toBe(true);
    });

    test("verify-jwt validates against a JWKS document", async () => {
      const { publicKey, privateKey } = await jose.generateKeyPair("RS256", {
        extractable: true,
      });
      const token = await makeToken(privateKey, "RS256");
      const jwk = await jose.exportJWK(publicKey);
      jwk.alg = "RS256";
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", {
        token,
        key: JSON.stringify({ keys: [jwk] }),
      });
      expect(JSON.parse(text).isValid).toBe(true);
    });

    test("verify-jwt reports when no key is provided", async () => {
      const token = await makeToken(new TextEncoder().encode(secret), "HS256");
      const client = await connectClient();

      const { text } = await callTool(client, "verify-jwt", { token });
      const result = JSON.parse(text);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("No key");
    });
  });

  describe("manual tools", () => {
    test("list-manual-pages returns the page names", async () => {
      const client = await connectClient();
      const { isError, text } = await callTool(client, "list-manual-pages");
      expect(isError).toBe(false);
      const pages = JSON.parse(text);
      expect(pages).toContain("home");
      expect(pages).toContain("handlers");
    });

    test("get-manual-page returns raw markdown", async () => {
      const client = await connectClient();
      const { isError, text } = await callTool(client, "get-manual-page", {
        name: "home",
      });
      expect(isError).toBe(false);
      expect(text.length).toBeGreaterThan(0);
    });

    test("get-manual-page returns error for unknown page", async () => {
      const client = await connectClient();
      const { isError, text } = await callTool(client, "get-manual-page", {
        name: "does-not-exist",
      });
      expect(isError).toBe(true);
      expect(text).toContain("Available pages");
    });
  });
});
