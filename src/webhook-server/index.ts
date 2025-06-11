import "@/server-only";
import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import { EXCLUDE_HEADER_MAP, WEBHOOK_PORT } from "../config-shared";
import { handleRequest } from "@/handlers/server";
import { startRequest, completeRequest } from "@/request-events/server";
import type { RequestEvent } from "@/request-events/shared";

const app = express();
app.use(morgan("combined"));

//
// Webhook router
// Used for responding to generic HTTP requests
//

app.use(bodyParser.raw({ type: "*/*" }));
// app.use(requestLogger);
app.all("*", async (req, res) => {
  const headers = { ...req.headers };
  for (const header of Object.keys(headers)) {
    if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
  }

  const event: RequestEvent = {
    id: randomUUID(),
    type: "inbound",
    status: "running",
    request: {
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date(),
      body: Buffer.isBuffer(req.body) ? req.body : null,
      headers,
    },
    handlers: [],
  };

  startRequest(event);

  // intercept response write so we can log the response info
  // ref. https://stackoverflow.com/a/50161321

  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks: Buffer[] = [];

  res.write = (...restArgs) => {
    chunks.push(Buffer.from(restArgs[0]));
    oldWrite.apply(res, restArgs);
  };

  res.end = (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks);
    oldEnd.apply(res, restArgs);

    completeRequest({
      id: event.id,
      status: "complete",
      response: {
        status: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.getHeaders(),
        body: body.length > 0 ? body : null,
        timestamp: new Date(),
      },
    });
  };

  // TODO handle errors
  const [error, response] = await handleRequest(event);

  const responseStatus =
    typeof response?.status === "number" ? response.status : 200;
  res.status(responseStatus);
  for (const [k, v] of Object.entries(response?.headers ?? {})) {
    res.set(k, v.toString());
  }
  res.send(
    response?.body === undefined ? { status: responseStatus } : response.body
  );
});

export function startWebhookServer() {
  return new Promise<void>((resolve) => {
    app.listen(WEBHOOK_PORT, () => {
      resolve();
    });
  });
}
