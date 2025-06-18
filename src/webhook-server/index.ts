/**
 * Implementation of the Web server that receives arbitrary HTTP requests, runs a Handler chain for the requests, and returns a response.
 * The execution of each request is tracked as a RequestEvent.
 */
import "@/server-only";
import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { EXCLUDE_HEADER_MAP, WEBHOOK_PORT } from "../config-shared";
import type { RequestEvent } from "@/request-events/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";
import { fromObject } from "@/util/kv-list";
import type { HttpMethod } from "@/util/http";
import { fromBufferLike } from "@/util/base64";
import { createRequestEvent, updateRequestEvent } from "@/request-events/model";
import { appEvents } from "@/events/emitter";
import { handleRequest } from "./handle-request";

// NOTE: Express is used for the webhook server instead of Bun.serve() because we want to
// be able to inspect the final HTTP response sent to the client (including content-length, etc.)
// which isn't possible with Bun.serve().
const app = express();

app.use(morgan("combined"));
app.use(bodyParser.raw({ type: "*/*" }));

app.all("*", async (req, res) => {
  const headers = { ...req.headers };
  for (const header of Object.keys(headers)) {
    if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
  }

  const event: RequestEvent = {
    id: randomUUID(),
    type: "inbound",
    status: "running",
    request_url: req.originalUrl,
    request_method: req.method as HttpMethod,
    request_timestamp: now(),
    request_body: Buffer.isBuffer(req.body) ? fromBufferLike(req.body) : null,
    request_headers: fromObject(headers),
  };

  const createdEvent = createRequestEvent(event);
  appEvents.emit("request:created", createdEvent);

  // intercept response write so we can log the response info
  // ref. https://stackoverflow.com/a/50161321

  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks: Buffer[] = [];

  res.write = (...restArgs) => {
    chunks.push(Buffer.from(restArgs[0]));
    return oldWrite.apply(res, restArgs);
  };

  res.end = (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks as any);
    const result = oldEnd.apply(res, restArgs);

    const updatedEvent = updateRequestEvent({
      id: event.id,
      status: "complete",
      response_status: res.statusCode,
      response_status_message: res.statusMessage,
      response_headers: fromObject(res.getHeaders()),
      response_body: body.length > 0 ? fromBufferLike(body) : null,
      response_timestamp: now(),
    });
    appEvents.emit("request:updated", updatedEvent);
    return result;
  };

  // TODO handle errors
  const [error, response] = await handleRequest(event);

  const responseStatus =
    typeof response?.status === "number" ? response.status : 200;
  res.status(responseStatus);
  for (const [k, v] of response?.response_headers) {
    res.set(k, v.toString());
  }
  res.send(
    response?.response_body === undefined
      ? { status: responseStatus }
      : response.response_body
  );
});

export function startWebhookServer() {
  return new Promise<void>((resolve) => {
    app.listen(WEBHOOK_PORT, () => {
      resolve();
    });
  });
}
