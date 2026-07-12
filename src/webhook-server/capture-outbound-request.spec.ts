import { describe, test, expect, afterAll } from "bun:test";
import { captureOutboundRequest } from "./capture-outbound-request";
import { getRequestEvent } from "@/request-events/model";
import type { HandlerRequest } from "./schema";

describe("captureOutboundRequest", () => {
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      new Response("pong", { status: 201, headers: { "x-echo": "1" } }),
  });
  afterAll(() => server.stop(true));

  test("creates a complete outbound event with the response", async () => {
    const request: HandlerRequest = {
      method: "POST",
      url: `http://localhost:${server.port}/target`,
      external: true,
      headers: [["x-test", "abc"]],
      query: [["q", "1"]],
      body: Buffer.from("hello").toString("base64"),
    };
    const { event, response, body } = await captureOutboundRequest(request);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(201);
    expect(Buffer.from(body!, "base64").toString()).toBe("pong");

    const stored = getRequestEvent(event.id);
    expect(stored.type).toBe("outbound");
    expect(stored.status).toBe("complete");
    expect(stored.request_method).toBe("POST");
    expect(stored.request_url).toBe(`http://localhost:${server.port}/target`);
    expect(stored.response_status).toBe(201);
    expect(stored.response_headers).toEqual(
      expect.arrayContaining([["x-echo", "1"]]),
    );
    expect(Buffer.from(stored.response_body!, "base64").toString()).toBe(
      "pong",
    );
  });

  test("records a failed request as an error event", async () => {
    const request: HandlerRequest = {
      method: "GET",
      url: "http://localhost:9/unreachable", // discard port: nothing listens
      external: true,
      headers: [],
      query: [],
      body: null,
    };
    const { event, response, body } = await captureOutboundRequest(request);

    expect(response).toBeNull();
    expect(body).toBeNull();

    const stored = getRequestEvent(event.id);
    expect(stored.type).toBe("outbound");
    expect(stored.status).toBe("error");
    expect(stored.response_status ?? null).toBeNull();
  });
});
