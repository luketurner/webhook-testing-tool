import { expect, test, describe, beforeEach } from "bun:test";
import { RequestEvent } from "./request";
import { randomUUID } from "crypto";
import { clearHandlers, handleRequest, insertHandler } from "./handler";

describe("handleRequest()", () => {
  let request: RequestEvent;

  beforeEach(() => {
    request = {
      id: randomUUID(),
      type: "inbound",
      status: "running",
      request: {
        url: "/",
        method: "get",
        timestamp: new Date(),
        body: null,
        headers: {},
      },
    };

    clearHandlers();
  });

  const defineHandler = (order, method, path, code) => {
    insertHandler({
      id: randomUUID(),
      versionId: "1",
      method,
      path,
      code,
      name: "Test handler",
      order,
    });
  };

  test("it should return the default response if no handlers are defined", async () => {
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      headers: {},
      status: 200,
    });
  });

  test("it should run the handler if it matches the request", async () => {
    defineHandler(1, "GET", "/", "resp.status = 201;");
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      headers: {},
      status: 201,
    });
  });

  test("it should not run the handler if it doesn't matches the request", async () => {
    defineHandler(1, "GET", "/foo", "resp.status = 201;");
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      headers: {},
      status: 200,
    });
  });

  test("it should run two handlers if they both match", async () => {
    defineHandler(1, "*", "/foo", "resp.body = 'foo'; resp.status = 202;");
    defineHandler(2, "get", "/foo/bar", "resp.body = 'bar';");
    request.request.url = "/foo/bar";
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      headers: {},
      body: "bar",
      status: 202,
    });
  });

  test("it should support parsing parameters from the URL", async () => {
    defineHandler(1, "GET", "/foo/:id", "resp.body = req.params.id");
    request.request.url = "/foo/bar";
    const [err, resp] = await handleRequest(request);
    expect(err).toBeNull();
    expect(resp).toEqual({
      headers: {},
      status: 200,
      body: "bar",
    });
  });
});
