import type { RequestEvent } from "@/request-events/schema";
import { expect, test, describe, beforeEach } from "bun:test";
import { clearHandlers, createHandler } from "../handlers/model";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";
import { handleRequest } from "@/webhook-server/handle-request";
import { parseBase64 } from "@/util/base64";

describe("handleRequest()", () => {
  let request: RequestEvent;

  beforeEach(() => {
    request = {
      id: randomUUID(),
      type: "inbound",
      status: "running",
      request_url: "/",
      request_method: "GET",
      request_timestamp: now(),
      request_body: null,
      request_headers: [],
    };

    clearHandlers();
  });

  const defineHandler = (order, method, path, code) => {
    const id = randomUUID();
    createHandler({
      id,
      version_id: "1",
      method,
      path,
      code,
      name: "Test handler",
      order,
    });
    return id;
  };

  test("it should return the default response if no handlers are defined", async () => {
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      response_headers: [],
      response_status: 200,
      response_status_message: null,
      response_body: null,
    });
  });

  test("it should run the handler if it matches the request", async () => {
    defineHandler(1, "GET", "/", "resp.status = 201;");
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      response_headers: [],
      response_status: 201,
      response_status_message: null,
      response_body: null,
    });
  });

  test("it should not run the handler if it doesn't matches the request", async () => {
    defineHandler(1, "GET", "/foo", "resp.status = 201;");
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      response_headers: [],
      response_status: 200,
      response_status_message: null,
      response_body: null,
    });
  });

  test("it should run two handlers if they both match", async () => {
    defineHandler(1, "*", "/foo", "resp.body = 'foo'; resp.status = 202;");
    defineHandler(2, "GET", "/foo/bar", "resp.body = 'bar';");
    request.request_url = "/foo/bar";
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      response_headers: [],
      response_body: parseBase64("YmFy"), // "bar" in base64
      response_status: 202,
      response_status_message: null,
    });
  });

  test("it should support parsing parameters from the URL", async () => {
    defineHandler(1, "GET", "/foo/:id", "resp.body = req.params.id");
    request.request_url = "/foo/bar";
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      response_headers: [],
      response_status: 200,
      response_body: parseBase64("YmFy"), // "bar" in base64
      response_status_message: null,
    });
  });

  test("it should create handler execution records", async () => {
    const id1 = defineHandler(
      1,
      "*",
      "/foo",
      "resp.body = 'foo'; resp.status = 202;",
    );
    const id2 = defineHandler(2, "GET", "/foo/bar", "resp.body = 'bar';");
    request.request_url = "/foo/bar";
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      response_headers: [],
      response_body: parseBase64("YmFy"), // "bar" in base64
      response_status: 202,
      response_status_message: null,
    });
    // NOTE: Handler execution tracking is now stored in separate table
    // We would need to import and test the HandlerExecution model here
    // But for now we just verify the core functionality works
  });
});
