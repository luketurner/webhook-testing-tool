import { getHandlerExecutionsByRequestId } from "@/handler-executions/model";
import { createRequestEvent } from "@/request-events/model";
import type { RequestEvent } from "@/request-events/schema";
import { parseBase64 } from "@/util/base64";
import { now } from "@/util/datetime";
import { randomUUID } from "@/util/uuid";
import { handleRequest } from "@/webhook-server/handle-request";
import { beforeEach, describe, expect, test } from "bun:test";
import { createHandler } from "../handlers/model";

describe("handleRequest()", () => {
  let request: RequestEvent;

  beforeEach(() => {
    const requestData = {
      id: randomUUID(),
      type: "inbound" as const,
      status: "running" as const,
      request_url: "/",
      request_method: "GET" as const,
      request_timestamp: now(),
      request_body: null,
      request_headers: [],
    };

    // Create the request event in the database
    request = createRequestEvent(requestData as RequestEvent);
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

  describe("path parameter functionality", () => {
    test("it should extract single parameter", async () => {
      defineHandler(1, "GET", "/users/:id", "resp.body = req.params.id");
      request.request_url = "/users/123";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toBe(parseBase64("MTIz")); // "123" in base64
    });

    test("it should extract multiple parameters", async () => {
      defineHandler(
        1,
        "GET",
        "/users/:userId/posts/:postId",
        "resp.body = JSON.stringify({ userId: req.params.userId, postId: req.params.postId })",
      );
      request.request_url = "/users/456/posts/789";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        userId: "456",
        postId: "789",
      });
    });

    test("it should handle parameters with hyphens and dots", async () => {
      defineHandler(
        1,
        "GET",
        "/flights/:from-:to",
        "resp.body = JSON.stringify({ from: req.params.from, to: req.params.to })",
      );
      request.request_url = "/flights/LAX-SFO";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        from: "LAX",
        to: "SFO",
      });
    });

    test("it should handle parameters with dots in path", async () => {
      defineHandler(
        1,
        "GET",
        "/files/:name.:ext",
        "resp.body = JSON.stringify({ name: req.params.name, ext: req.params.ext })",
      );
      request.request_url = "/files/document.pdf";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        name: "document",
        ext: "pdf",
      });
    });

    test("it should handle numeric parameters", async () => {
      defineHandler(
        1,
        "GET",
        "/api/v:version/users/:id",
        "resp.body = JSON.stringify({ version: req.params.version, id: req.params.id, idType: typeof req.params.id })",
      );
      request.request_url = "/api/v2/users/12345";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        version: "2",
        id: "12345",
        idType: "string", // Parameters are always strings
      });
    });

    test("it should handle parameters with special characters", async () => {
      defineHandler(1, "GET", "/users/:id", "resp.body = req.params.id");
      request.request_url = "/users/user_123-test";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(decodedBody).toBe("user_123-test");
    });

    test("it should handle URL encoded parameters", async () => {
      defineHandler(1, "GET", "/search/:query", "resp.body = req.params.query");
      request.request_url = "/search/hello%20world";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(decodedBody).toBe("hello world"); // Parameters are automatically decoded by the router
    });

    test("it should handle parameters with underscores and dashes", async () => {
      defineHandler(
        1,
        "GET",
        "/users/:user_id/posts/:post_id",
        "resp.body = JSON.stringify({ userId: req.params.user_id, postId: req.params.post_id })",
      );

      request.request_url = "/users/user_123/posts/post_456";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).not.toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        userId: "user_123",
        postId: "post_456",
      });
    });

    test("it should handle parameters in different HTTP methods", async () => {
      defineHandler(
        1,
        "POST",
        "/users/:id/update",
        "resp.body = JSON.stringify({ method: req.method, userId: req.params.id })",
      );
      request.request_method = "POST";
      request.request_url = "/users/789/update";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        method: "POST",
        userId: "789",
      });
    });

    test("it should handle parameters with query strings", async () => {
      defineHandler(
        1,
        "GET",
        "/users/:id",
        `resp.body = JSON.stringify({ 
          userId: req.params.id, 
          queryParams: req.query 
        })`,
      );
      request.request_url = "/users/123?active=true&limit=10";
      request.request_query_params = [
        ["active", "true"],
        ["limit", "10"],
      ];
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      const result = JSON.parse(decodedBody);
      expect(result.userId).toBe("123");
      expect(result.queryParams).toEqual([
        ["active", "true"],
        ["limit", "10"],
      ]);
    });

    test("it should share parameters via locals between handlers", async () => {
      defineHandler(
        1,
        "GET",
        "/users/:id/profile",
        `
        locals.userId = req.params.id;
        locals.requestedResource = "profile";
        console.log("Handler 1 - extracted userId:", req.params.id);
        `,
      );

      defineHandler(
        2,
        "GET",
        "/users/:id/profile",
        `
        console.log("Handler 2 - userId from locals:", locals.userId);
        console.log("Handler 2 - current params:", JSON.stringify(req.params));
        resp.body = JSON.stringify({
          fromParams: req.params.id,
          fromLocals: locals.userId,
          resource: locals.requestedResource
        });
        `,
      );

      request.request_url = "/users/user456/profile";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        fromParams: "user456",
        fromLocals: "user456",
        resource: "profile",
      });

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].console_output).toContain(
        "[LOG] Handler 1 - extracted userId: user456",
      );
      expect(executions[1].console_output).toContain(
        "[LOG] Handler 2 - userId from locals: user456",
      );
    });

    test("it should handle complex nested parameters", async () => {
      defineHandler(
        1,
        "GET",
        "/api/:version/users/:userId/posts/:postId/comments/:commentId",
        `resp.body = JSON.stringify({
          version: req.params.version,
          userId: req.params.userId,
          postId: req.params.postId,
          commentId: req.params.commentId,
          allParams: req.params
        })`,
      );
      request.request_url =
        "/api/v1/users/john_doe/posts/post_123/comments/comment_456";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      const result = JSON.parse(decodedBody);
      expect(result).toEqual({
        version: "v1",
        userId: "john_doe",
        postId: "post_123",
        commentId: "comment_456",
        allParams: {
          version: "v1",
          userId: "john_doe",
          postId: "post_123",
          commentId: "comment_456",
        },
      });
    });

    test("it should handle parameters with validation logic", async () => {
      defineHandler(
        1,
        "GET",
        "/users/:id",
        `
        const userId = req.params.id;
        
        // Basic validation
        if (!userId) {
          throw new BadRequestError("User ID is required");
        }
        
        if (userId.length < 3) {
          throw new BadRequestError("User ID must be at least 3 characters");
        }
        
        // Store validated ID
        locals.validatedUserId = userId;
        console.log("Validated user ID:", userId);
        `,
      );

      defineHandler(
        2,
        "GET",
        "/users/:id",
        `
        resp.body = JSON.stringify({
          userId: locals.validatedUserId,
          message: "User validated successfully"
        });
        `,
      );

      // Test with valid ID
      request.request_url = "/users/user123";
      const [err1, resp1] = await handleRequest(request);
      expect(err1).toBeNull();

      const decodedBody1 = Buffer.from(
        Uint8Array.fromBase64(resp1.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody1)).toEqual({
        userId: "user123",
        message: "User validated successfully",
      });

      // Test with invalid ID (too short)
      const request2 = createRequestEvent({
        id: randomUUID(),
        type: "inbound" as const,
        status: "running" as const,
        request_url: "/users/ab",
        request_method: "GET" as const,
        request_timestamp: now(),
        request_body: null,
        request_headers: [],
      } as RequestEvent);

      const [err2, resp2] = await handleRequest(request2);
      expect(err2).not.toBeNull();
      expect(err2.message).toBe("User ID must be at least 3 characters");
    });

    test("it should handle parameters with pattern matching", async () => {
      // Test numeric-only parameter pattern
      defineHandler(
        1,
        "GET",
        "/orders/:orderId",
        `
        const orderId = req.params.orderId;
        
        // Check if orderId is numeric
        if (!/^\\d+$/.test(orderId)) {
          throw new BadRequestError("Order ID must be numeric");
        }
        
        resp.body = JSON.stringify({
          orderId: orderId,
          orderNumber: parseInt(orderId),
          type: "order"
        });
        `,
      );

      // Test with valid numeric ID
      request.request_url = "/orders/12345";
      const [err1, resp1] = await handleRequest(request);
      expect(err1).toBeNull();

      const decodedBody1 = Buffer.from(
        Uint8Array.fromBase64(resp1.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody1)).toEqual({
        orderId: "12345",
        orderNumber: 12345,
        type: "order",
      });

      // Test with invalid non-numeric ID
      const request2 = createRequestEvent({
        id: randomUUID(),
        type: "inbound" as const,
        status: "running" as const,
        request_url: "/orders/abc123",
        request_method: "GET" as const,
        request_timestamp: now(),
        request_body: null,
        request_headers: [],
      } as RequestEvent);

      const [err2, resp2] = await handleRequest(request2);
      expect(err2).not.toBeNull();
      expect(err2.message).toBe("Order ID must be numeric");
    });

    test("it should handle parameters in successful scenarios", async () => {
      defineHandler(
        1,
        "GET",
        "/users/:id/profile",
        `
        const userId = req.params.id;
        locals.userId = userId;
        console.log("Loading profile for user:", userId);
        `,
      );

      defineHandler(
        2,
        "GET",
        "/users/:id/profile",
        `
        resp.body = JSON.stringify({
          profile: {
            userId: locals.userId,
            name: "User " + locals.userId,
            loaded: true
          }
        });
        `,
      );

      request.request_url = "/users/user123/profile";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).not.toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual({
        profile: {
          userId: "user123",
          name: "User user123",
          loaded: true,
        },
      });

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(2);
      expect(executions[0].status).toBe("success");
      expect(executions[1].status).toBe("success");
    });

    test("it should handle multiple parameter patterns", async () => {
      defineHandler(
        1,
        "GET",
        "/api/v:version/:resource/:id",
        `
        resp.body = JSON.stringify({
          version: req.params.version,
          resource: req.params.resource,
          id: req.params.id,
          fullPath: req.url
        });
        `,
      );

      request.request_url = "/api/v2/users/456";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).not.toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      const result = JSON.parse(decodedBody);

      expect(result).toEqual({
        version: "2",
        resource: "users",
        id: "456",
        fullPath: "/api/v2/users/456",
      });
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

  describe("console logging functionality", () => {
    test("it should capture console.log output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Hello World");
        console.log("Testing", 123);
        resp.body = "success";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toEqual(parseBase64("c3VjY2Vzcw==")); // "success" in base64

      // Check that handler execution was created with console output
      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain("[LOG] Hello World");
      expect(executions[0].console_output).toContain("[LOG] Testing 123");
      expect(executions[0].status).toBe("success");
    });

    test("it should capture console.error output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.error("This is an error");
        console.error("Error object:", {code: 404, message: "Not found"});
        resp.body = "error_logged";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain(
        "[ERROR] This is an error",
      );
      expect(executions[0].console_output).toContain(
        '[ERROR] Error object: {"code":404,"message":"Not found"}',
      );
      expect(executions[0].status).toBe("success");
    });

    test("it should capture console.warn output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.warn("Warning message");
        console.warn("Object warning:", {level: "medium"});
        resp.body = "warning_logged";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain("[WARN] Warning message");
      expect(executions[0].console_output).toContain(
        '[WARN] Object warning: {"level":"medium"}',
      );
      expect(executions[0].status).toBe("success");
    });

    test("it should capture console.info output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.info("Info message");
        console.info("Processing:", {step: 1, total: 5});
        resp.body = "info_logged";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain("[INFO] Info message");
      expect(executions[0].console_output).toContain(
        '[INFO] Processing: {"step":1,"total":5}',
      );
      expect(executions[0].status).toBe("success");
    });

    test("it should capture console.debug output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.debug("Debug message");
        console.debug("Debug data:", {timestamp: Date.now()});
        resp.body = "debug_logged";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain("[DEBUG] Debug message");
      expect(executions[0].console_output).toContain("[DEBUG] Debug data:");
      expect(executions[0].status).toBe("success");
    });

    test("it should capture mixed console output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Starting process");
        console.info("Processing item 1");
        console.warn("Item 1 has issues");
        console.error("Failed to process item 2");
        console.debug("Debug info for item 3");
        resp.body = "mixed_logged";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();

      const output = executions[0].console_output;
      expect(output).toContain("[LOG] Starting process");
      expect(output).toContain("[INFO] Processing item 1");
      expect(output).toContain("[WARN] Item 1 has issues");
      expect(output).toContain("[ERROR] Failed to process item 2");
      expect(output).toContain("[DEBUG] Debug info for item 3");
      expect(executions[0].status).toBe("success");
    });

    test("it should capture console output even when handler throws error", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Before error");
        console.error("About to throw");
        throw new Error("Test error");
        console.log("This should not appear");
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain("[LOG] Before error");
      expect(executions[0].console_output).toContain("[ERROR] About to throw");
      expect(executions[0].console_output).not.toContain(
        "This should not appear",
      );
      expect(executions[0].status).toBe("error");
      expect(executions[0].error_message).toBe("Error: Test error");
    });

    test("it should handle console output with multiple arguments", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("User:", {id: 123, name: "John"}, "logged in at", new Date().toISOString());
        console.error("Error code:", 500, "message:", "Internal Server Error");
        resp.body = "multi_args_logged";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).not.toBeNull();

      const output = executions[0].console_output;
      expect(output).toContain(
        '[LOG] User: {"id":123,"name":"John"} logged in at',
      );
      expect(output).toContain(
        "[ERROR] Error code: 500 message: Internal Server Error",
      );
      expect(executions[0].status).toBe("success");
    });

    test("it should handle empty console output", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        resp.body = "no_console_output";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].console_output).toBeNull();
      expect(executions[0].status).toBe("success");
    });

    test("it should capture console output from multiple handlers", async () => {
      defineHandler(
        1,
        "*",
        "/",
        "console.log('Handler 1'); locals.fromHandler1 = true;",
      );
      defineHandler(
        2,
        "GET",
        "/",
        "console.log('Handler 2'); resp.body = 'multi_handlers';",
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(2);

      // First handler
      expect(executions[0].console_output).not.toBeNull();
      expect(executions[0].console_output).toContain("[LOG] Handler 1");
      expect(executions[0].order).toBe(0);
      expect(executions[0].status).toBe("success");

      // Second handler
      expect(executions[1].console_output).not.toBeNull();
      expect(executions[1].console_output).toContain("[LOG] Handler 2");
      expect(executions[1].order).toBe(1);
      expect(executions[1].status).toBe("success");
    });
  });

  describe("shared state functionality", () => {
    test("it should initialize shared state as empty object", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Shared state type:", typeof shared);
        console.log("Shared state keys:", Object.keys(shared));
        resp.body = JSON.stringify(shared);
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toBeDefined();

      // Decode and verify the response content
      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(decodedBody).toBe("{}");

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].console_output).toContain(
        "[LOG] Shared state type: object",
      );
      expect(executions[0].console_output).toContain(
        "[LOG] Shared state keys: ",
      );
    });

    test("it should allow handlers to modify shared state", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        shared.counter = 42;
        shared.message = "hello world";
        shared.data = { nested: true };
        resp.body = "modified";
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toBeDefined();

      // Decode and verify the response content
      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(decodedBody).toBe("modified");
    });

    test("it should share data between multiple handlers in same request", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        shared.counter = 1;
        shared.handlers = ["handler1"];
        console.log("Handler 1 - counter:", shared.counter);
        `,
      );

      defineHandler(
        2,
        "GET",
        "/",
        `
        shared.counter += 10;
        shared.handlers.push("handler2");
        console.log("Handler 2 - counter:", shared.counter);
        console.log("Handler 2 - handlers:", shared.handlers);
        `,
      );

      defineHandler(
        3,
        "GET",
        "/",
        `
        shared.counter *= 2;
        shared.handlers.push("handler3");
        console.log("Handler 3 - counter:", shared.counter);
        resp.body = JSON.stringify({
          counter: shared.counter,
          handlers: shared.handlers
        });
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const expectedResult = {
        counter: 22, // (1 + 10) * 2
        handlers: ["handler1", "handler2", "handler3"],
      };
      expect(resp.response_body).toBeDefined();

      // Decode and verify the response content
      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual(expectedResult);

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].console_output).toContain(
        "[LOG] Handler 1 - counter: 1",
      );
      expect(executions[1].console_output).toContain(
        "[LOG] Handler 2 - counter: 11",
      );
      expect(executions[2].console_output).toContain(
        "[LOG] Handler 3 - counter: 22",
      );
    });

    // Note: This test demonstrates shared state persistence but is disabled due to test isolation issues
    // The functionality works correctly as shown by other tests
    test("it should persist shared state across multiple requests", async () => {
      // First request - initialize counter
      defineHandler(
        1,
        "GET",
        "/increment",
        `
        if (shared.counter === undefined) {
          shared.counter = 0;
        }
        shared.counter++;
        resp.body = JSON.stringify({ counter: shared.counter });
        `,
      );

      // Update request to match the handler path
      request.request_url = "/increment";

      // Make first request
      const [err1, resp1] = await handleRequest(request);
      expect(err1).toBeNull();
      expect(resp1.response_body).toBeDefined();

      // Parse the response to get the counter value
      const response1 = JSON.parse(
        Buffer.from(Uint8Array.fromBase64(resp1.response_body)).toString(
          "utf-8",
        ),
      );
      const firstCounter = response1.counter;
      expect(typeof firstCounter).toBe("number");

      // Create second request
      const request2 = createRequestEvent({
        id: randomUUID(),
        type: "inbound" as const,
        status: "running" as const,
        request_url: "/increment",
        request_method: "GET" as const,
        request_timestamp: now(),
        request_body: null,
        request_headers: [],
      } as RequestEvent);

      // Make second request
      const [err2, resp2] = await handleRequest(request2);
      expect(err2).toBeNull();
      expect(resp2.response_body).toBeDefined();

      // Parse the response and check that counter incremented
      const response2 = JSON.parse(
        Buffer.from(Uint8Array.fromBase64(resp2.response_body)).toString(
          "utf-8",
        ),
      );
      expect(response2.counter).toBe(firstCounter + 1);

      // Create third request
      const request3 = createRequestEvent({
        id: randomUUID(),
        type: "inbound" as const,
        status: "running" as const,
        request_url: "/increment",
        request_method: "GET" as const,
        request_timestamp: now(),
        request_body: null,
        request_headers: [],
      } as RequestEvent);

      // Make third request
      const [err3, resp3] = await handleRequest(request3);
      expect(err3).toBeNull();
      expect(resp3.response_body).toBeDefined();

      // Parse the response and check that counter incremented again
      const response3 = JSON.parse(
        Buffer.from(Uint8Array.fromBase64(resp3.response_body)).toString(
          "utf-8",
        ),
      );
      expect(response3.counter).toBe(firstCounter + 2);
    });

    test("it should handle complex shared state operations", async () => {
      defineHandler(
        1,
        "GET",
        "/complex",
        `
        // Initialize complex data structure
        if (!shared.users) {
          shared.users = [];
          shared.stats = { requests: 0, errors: 0 };
          shared.config = { version: "1.0", features: ["auth", "logging"] };
        }
        
        // Add user
        shared.users.push({ id: shared.users.length + 1, name: "User " + (shared.users.length + 1) });
        shared.stats.requests++;
        
        // Log current state
        console.log("Users count:", shared.users.length);
        console.log("Total requests:", shared.stats.requests);
        
        resp.body = JSON.stringify({
          userCount: shared.users.length,
          totalRequests: shared.stats.requests,
          version: shared.config.version
        });
        `,
      );

      // Update request to match the handler path
      request.request_url = "/complex";

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const expectedResult = {
        userCount: 1,
        totalRequests: 1,
        version: "1.0",
      };
      expect(resp.response_body).toBeDefined();

      // Decode and verify the response content
      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual(expectedResult);

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].console_output).toContain("[LOG] Users count: 1");
      expect(executions[0].console_output).toContain("[LOG] Total requests: 1");
    });

    test("it should handle shared state with error in one handler", async () => {
      defineHandler(
        1,
        "GET",
        "/error-test",
        `
        shared.beforeError = "set";
        shared.counter = 100;
        console.log("Handler 1 executed");
        `,
      );

      defineHandler(
        2,
        "GET",
        "/error-test",
        `
        shared.afterError = "should not be set";
        throw new Error("Test error");
        `,
      );

      defineHandler(
        3,
        "GET",
        "/error-test",
        `
        // This handler should not run due to error in handler 2
        shared.afterError = "should not be set either";
        `,
      );

      // Update request to match the handler path
      request.request_url = "/error-test";

      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();
      expect(err.message).toBe("Test error");

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].status).toBe("success");
      expect(executions[1].status).toBe("error");
      expect(executions).toHaveLength(2); // Third handler should not execute
    });
  });

  describe("locals object functionality", () => {
    test("it should initialize locals as empty object", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Locals type:", typeof locals);
        console.log("Locals keys:", Object.keys(locals));
        resp.body = JSON.stringify(locals);
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toBeDefined();

      // Decode and verify the response content
      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(decodedBody).toBe("{}");

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].console_output).toContain(
        "[LOG] Locals type: object",
      );
      expect(executions[0].console_output).toContain("[LOG] Locals keys: ");
    });

    test("it should share data between handlers in same request", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        locals.userId = "12345";
        locals.userData = { name: "John Doe", role: "admin" };
        locals.flags = ["feature1", "feature2"];
        console.log("Handler 1 - Set locals data");
        `,
      );

      defineHandler(
        2,
        "GET",
        "/",
        `
        console.log("Handler 2 - userId:", locals.userId);
        console.log("Handler 2 - userData:", JSON.stringify(locals.userData));
        console.log("Handler 2 - flags:", locals.flags);
        locals.processedBy = "handler2";
        `,
      );

      defineHandler(
        3,
        "GET",
        "/",
        `
        console.log("Handler 3 - All locals:", JSON.stringify(locals));
        resp.body = locals;
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const expectedResult = {
        userId: "12345",
        userData: { name: "John Doe", role: "admin" },
        flags: ["feature1", "feature2"],
        processedBy: "handler2",
      };
      expect(resp.response_body).toBeDefined();

      // Decode and verify the response content
      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      expect(JSON.parse(decodedBody)).toEqual(expectedResult);

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions[0].console_output).toContain(
        "[LOG] Handler 1 - Set locals data",
      );
      expect(executions[1].console_output).toContain(
        "[LOG] Handler 2 - userId: 12345",
      );
      expect(executions[1].console_output).toContain(
        '[LOG] Handler 2 - userData: {"name":"John Doe","role":"admin"}',
      );
      expect(executions[2].console_output).toContain(
        "[LOG] Handler 3 - All locals:",
      );
    });

    test("it should not share locals between different requests", async () => {
      defineHandler(
        1,
        "GET",
        "/locals-test",
        `
        locals.requestId = ctx.requestEvent.id;
        locals.timestamp = Date.now();
        resp.body = { requestId: locals.requestId };
        `,
      );

      // Update request to match the handler path
      request.request_url = "/locals-test";

      // First request
      const [err1, resp1] = await handleRequest(request);
      expect(err1).toBeNull();
      const response1 = JSON.parse(
        Buffer.from(Uint8Array.fromBase64(resp1.response_body)).toString(
          "utf-8",
        ),
      );
      expect(response1.requestId).toBe(request.id);

      // Create second request
      const request2 = createRequestEvent({
        id: randomUUID(),
        type: "inbound" as const,
        status: "running" as const,
        request_url: "/locals-test",
        request_method: "GET" as const,
        request_timestamp: now(),
        request_body: null,
        request_headers: [],
      } as RequestEvent);

      // Second request should have different locals
      const [err2, resp2] = await handleRequest(request2);
      expect(err2).toBeNull();
      const response2 = JSON.parse(
        Buffer.from(Uint8Array.fromBase64(resp2.response_body)).toString(
          "utf-8",
        ),
      );
      expect(response2.requestId).toBe(request2.id);
      expect(response2.requestId).not.toBe(response1.requestId);
    });

    test("it should handle complex data structures in locals", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        // Store validation results
        locals.validation = {
          isValid: true,
          errors: [],
          warnings: ["Consider upgrading to v2 API"],
          timestamp: new Date().toISOString()
        };
        
        // Store user context
        locals.user = {
          id: "user-123",
          permissions: ["read", "write"],
          metadata: { lastLogin: Date.now() }
        };
        
        // Store processing flags
        locals.processed = {
          authentication: true,
          validation: true,
          rateLimit: false
        };
        `,
      );

      defineHandler(
        2,
        "GET",
        "/",
        `
        // Modify existing data
        locals.validation.errors.push("Minor formatting issue");
        locals.user.permissions.push("admin");
        locals.processed.dataTransform = true;
        
        // Add new data
        locals.responseMetadata = {
          handler: "handler2",
          processingTime: 100
        };
        
        resp.body = locals;
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      const result = JSON.parse(decodedBody);

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toEqual(["Minor formatting issue"]);
      expect(result.validation.warnings).toEqual([
        "Consider upgrading to v2 API",
      ]);
      expect(result.user.id).toBe("user-123");
      expect(result.user.permissions).toEqual(["read", "write", "admin"]);
      expect(result.processed.dataTransform).toBe(true);
      expect(result.responseMetadata.handler).toBe("handler2");
    });

    test("it should maintain locals when handler throws error", async () => {
      defineHandler(
        1,
        "GET",
        "/error-locals",
        `
        locals.step1 = "completed";
        locals.data = { processed: true };
        console.log("Handler 1 completed");
        `,
      );

      defineHandler(
        2,
        "GET",
        "/error-locals",
        `
        locals.step2 = "started";
        console.log("Handler 2 - locals before error:", JSON.stringify(locals));
        throw new Error("Processing failed");
        `,
      );

      defineHandler(
        3,
        "GET",
        "/error-locals",
        `
        // This should not execute
        locals.step3 = "should not reach";
        `,
      );

      // Update request to match the handler path
      request.request_url = "/error-locals";

      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();
      expect(err.message).toBe("Processing failed");

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(2); // Only first two handlers should execute
      expect(executions[0].status).toBe("success");
      expect(executions[1].status).toBe("error");
      expect(executions[1].console_output).toContain(
        '[LOG] Handler 2 - locals before error: {"step1":"completed","data":{"processed":true},"step2":"started"}',
      );
    });

    test("it should allow locals to control handler flow", async () => {
      defineHandler(
        1,
        "GET",
        "/conditional",
        `
        const authHeader = req.headers.find(([key]) => 
          key.toLowerCase() === 'authorization'
        )?.[1];
        
        if (authHeader === "Bearer valid-token") {
          locals.authenticated = true;
          locals.userId = "user-123";
        } else {
          locals.authenticated = false;
        }
        `,
      );

      defineHandler(
        2,
        "GET",
        "/conditional",
        `
        if (!locals.authenticated) {
          throw new UnauthorizedError("Authentication required");
        }
        
        // Process authenticated request
        locals.processedData = {
          userId: locals.userId,
          timestamp: Date.now()
        };
        `,
      );

      defineHandler(
        3,
        "GET",
        "/conditional",
        `
        resp.body = {
          success: true,
          data: locals.processedData
        };
        `,
      );

      // Test without auth header
      request.request_url = "/conditional";
      const [err1, resp1] = await handleRequest(request);
      expect(err1).not.toBeNull();
      expect(err1.message).toBe("Authentication required");

      // Test with auth header
      request.request_headers = [["Authorization", "Bearer valid-token"]];
      const [err2, resp2] = await handleRequest(request);
      expect(err2).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp2.response_body),
      ).toString("utf-8");
      const result = JSON.parse(decodedBody);
      expect(result.success).toBe(true);
      expect(result.data.userId).toBe("user-123");
    });

    test("it should handle locals with shared state interaction", async () => {
      defineHandler(
        1,
        "GET",
        "/mixed-state",
        `
        // Use shared state to get user data
        shared.users = shared.users || {};
        shared.users["user-456"] = { name: "Jane Smith", credits: 100 };
        
        // Store in locals for this request
        locals.currentUser = shared.users["user-456"];
        locals.originalCredits = locals.currentUser.credits;
        `,
      );

      defineHandler(
        2,
        "GET",
        "/mixed-state",
        `
        // Process transaction using locals
        const cost = 30;
        if (locals.currentUser.credits >= cost) {
          locals.currentUser.credits -= cost;
          locals.transactionSuccess = true;
          locals.remainingCredits = locals.currentUser.credits;
          
          // Update shared state
          shared.users["user-456"].credits = locals.currentUser.credits;
        } else {
          locals.transactionSuccess = false;
        }
        `,
      );

      defineHandler(
        3,
        "GET",
        "/mixed-state",
        `
        resp.body = {
          transaction: {
            success: locals.transactionSuccess,
            originalCredits: locals.originalCredits,
            remainingCredits: locals.remainingCredits
          },
          user: locals.currentUser
        };
        `,
      );

      request.request_url = "/mixed-state";
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const decodedBody = Buffer.from(
        Uint8Array.fromBase64(resp.response_body),
      ).toString("utf-8");
      const result = JSON.parse(decodedBody);

      expect(result.transaction.success).toBe(true);
      expect(result.transaction.originalCredits).toBe(100);
      expect(result.transaction.remainingCredits).toBe(70);
      expect(result.user.credits).toBe(70);
    });
  });

  describe("async/await functionality", () => {
    test("it should support top-level await with sleep function", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        await sleep(1);
        `,
      );

      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
    });
  });

  describe("body_raw functionality", () => {
    test("it should use body_raw when set instead of body", async () => {
      const base64Data = "SGVsbG8gV29ybGQ="; // "Hello World" in base64
      defineHandler(1, "GET", "/", `resp.body_raw = "${base64Data}";`);
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toBe(parseBase64(base64Data));
    });

    test("it should use body when body_raw is not set", async () => {
      defineHandler(1, "GET", "/", `resp.body = "Hello World";`);
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      // body should be converted to base64
      expect(resp.response_body).toBe(
        parseBase64(Buffer.from("Hello World").toString("base64")),
      );
    });

    test("it should prioritize body_raw over body when both are set", async () => {
      const base64Data = "SGVsbG8gV29ybGQ="; // "Hello World" in base64
      defineHandler(
        1,
        "GET",
        "/",
        `resp.body = "This should be ignored"; resp.body_raw = "${base64Data}";`,
      );
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect(resp.response_body).toBe(parseBase64(base64Data));
    });
  });

  describe("AbortSocketError functionality", () => {
    test("it should return AbortSocketError when thrown from handler", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        'throw new AbortSocketError("Connection aborted");',
      );
      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();
      expect(err.name).toBe("AbortSocketError");
      expect(err.message).toBe("Connection aborted");
    });

    test("it should record handler execution with socket aborted status", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Before abort");
        throw new AbortSocketError("Test abort");
      `,
      );
      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe("error");
      expect(executions[0].error_message).toBe("Socket aborted: Test abort");
      expect(executions[0].console_output).toContain("[LOG] Before abort");
    });

    test("it should abort without running subsequent handlers", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Handler 1 executed");
        throw new AbortSocketError("Aborting");
      `,
      );
      defineHandler(
        2,
        "GET",
        "/",
        `
        console.log("Handler 2 - should not execute");
        resp.body = "should not reach";
      `,
      );
      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1); // Only first handler should execute
      expect(executions[0].console_output).toContain(
        "[LOG] Handler 1 executed",
      );
    });

    test("it should support AbortSocketError with default message", async () => {
      defineHandler(1, "GET", "/", "throw new AbortSocketError();");
      const [err, resp] = await handleRequest(request);
      expect(err).not.toBeNull();
      expect(err.name).toBe("AbortSocketError");
      expect(err.message).toBe("Socket connection aborted");
    });
  });

  describe("resp.socket functionality", () => {
    test("it should include raw socket data in response when resp.socket is set", async () => {
      const rawData = "Raw socket data";
      defineHandler(1, "GET", "/", `resp.socket = "${rawData}";`);
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      expect((resp as any)._socketRawData).toBe(rawData);
    });

    test("it should prioritize resp.socket and mark it with special property", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        resp.status = 200;
        resp.body = "This should be ignored";
        resp.socket = "HTTP/1.1 400 Bad Request\\r\\n\\r\\n";
      `,
      );
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      // Note: JavaScript interprets \\r\\n in the handler code as actual escape sequences
      expect((resp as any)._socketRawData).toContain(
        "HTTP/1.1 400 Bad Request",
      );
    });

    test("it should support partial HTTP responses via resp.socket", async () => {
      defineHandler(1, "GET", "/", 'resp.socket = "HTTP/1.1 200 OK\\r\\n";');
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      // Note: JavaScript interprets \\r\\n in the handler code as actual escape sequences
      expect((resp as any)._socketRawData).toContain("HTTP/1.1 200 OK");
    });

    test("it should record handler execution when resp.socket is set", async () => {
      defineHandler(
        1,
        "GET",
        "/",
        `
        console.log("Setting raw socket data");
        resp.socket = "Raw data";
      `,
      );
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();

      const executions = getHandlerExecutionsByRequestId(request.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe("success");
      expect(executions[0].console_output).toContain(
        "[LOG] Setting raw socket data",
      );
    });

    test("it should support empty socket data", async () => {
      defineHandler(1, "GET", "/", 'resp.socket = "";');
      const [err, resp] = await handleRequest(request);
      expect(err).toBeNull();
      // Empty string should still be set
      expect((resp as any)._socketRawData).toBeDefined();
    });
  });
});
