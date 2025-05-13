import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import { runInNewContext } from "vm";
import { EXCLUDE_HEADER_MAP, WEBHOOK_PORT } from "./config";
import { db, WttScript } from "./db";

const app = express();
app.use(morgan("combined"));

//
// Webhook router
// Used for responding to generic HTTP requests
//

app.use(bodyParser.raw({ type: "*/*" }));
app.use(requestLogger);
app.all("*", (req, res) => {
  runResponderScript(req, res);
});

export function startWebhookServer() {
  return new Promise<void>((resolve) => {
    app.listen(WEBHOOK_PORT, () => {
      resolve();
    });
  });
}

/**
 * Given an Express request and response, this function looks up whether there are
 * any responder scripts that can be used to generate the response. If there are no
 * matching scripts, a simple 200 response is returned. If multiple scripts match,
 * the more specific one is executed.
 */
function runResponderScript(req, res) {
  const scripts = db
    .query(
      `
    SELECT id, method, path FROM scripts;
  `
    )
    .all() as WttScript[];

  const matchingScript = scripts
    .filter(
      (s) =>
        (s.method === req.method || s.method === "*") &&
        (req.originalUrl.startsWith(s.path) || s.path === "*")
    )
    .sort((s1, s2) => {
      if (s1.path === "*" && s2.path !== "*") return 1;
      if (s1.path !== "*" && s2.path === "*") return -1;

      if (s1.path.length < s2.path.length) return 1;
      if (s1.path.length > s2.path.length) return -1;

      if (s1.method === "*" && s2.method !== "*") return 1;
      if (s1.method !== "*" && s2.method === "*") return -1;
      return 0;
    })[0];

  const script = matchingScript?.id
    ? (db
        .query(
          `
    SELECT code FROM scripts WHERE id = $id;
  `
        )
        .get({ $id: matchingScript.id }) as Partial<WttScript>)
    : null;

  const code = script?.code ?? "null";
  let result;
  try {
    result = {
      headers: {},
      status: 200,
    };
    runInNewContext(code, {
      // JSON,
      req: {
        params: req.params,
        query: req.query,
        headers: req.headers,
        body: req.body,
        originalUrl: req.originalUrl,
        method: req.method,
      },
      res: result,
    });
  } catch (e) {
    console.error("Error running script", e);
    result = {
      status: 500,
      body: {
        error:
          "Error running responder script. See application logs for more details.",
      },
    };
  }
  const responseStatus =
    typeof result?.status === "number" ? result.status : 200;
  res.status(responseStatus);
  for (const [k, v] of Object.entries(result?.headers ?? {})) {
    res.set(k, v);
  }
  res.send(
    result?.body === undefined ? { status: responseStatus } : result.body
  );
}

/**
 * Function that implements logging of HTTP requests to the database. (Note that
 * logging to console is already handled by Morgan middleware).
 *
 * Before the request is sent, a row is added to the requests table. When we receive
 * a response, then the table is updated with response information.
 */
function requestLogger(req, res, next) {
  // unique "trace ID"
  const id = randomUUID();

  const headers = { ...req.headers };
  for (const header of Object.keys(headers)) {
    if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
  }

  db.query(
    `
    INSERT INTO requests (
      id,
      req_method,
      req_url,
      req_headers,
      req_body,
      req_timestamp
    ) VALUES (
      $id,
      $method,
      $url,
      $headers,
      $body,
      $timestamp
    )
  `
  ).run({
    $id: id,
    $method: req.method,
    $url: req.originalUrl,
    $headers: JSON.stringify(headers),
    $body: req.body instanceof Buffer ? req.body : undefined,
    $timestamp: Date.now(),
  });

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

    db.query(
      `
      UPDATE requests
      SET
        resp_status = $status,
        resp_statusmessage = $statusMessage,
        resp_headers = $headers,
        resp_body = $body,
        resp_timestamp = $timestamp
      WHERE id = $id
    `
    ).run({
      $id: id,
      $status: res.statusCode,
      $statusMessage: res.statusMessage,
      $headers: JSON.stringify(res.getHeaders()),
      $body: body,
      $timestamp: Date.now(),
    });
  };

  next();
}
