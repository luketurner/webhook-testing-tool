import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import basicAuth from "express-basic-auth";
import { DateTime, Duration } from "luxon";
import { runInNewContext } from "vm";
import { Database } from "bun:sqlite";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
hljs.registerLanguage("javascript", javascript);

//
// global configuration
//

const PORT = 3000;
const DB_FILE = process.env.WTT_DB_FILE || "local/data.sqlite";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = process.env.WTT_ADMIN_PASSWORD;
const NODE_ENV = process.env.NODE_ENV;
const EXCLUDE_HEADERS = process.env.WTT_EXCLUDE_HEADERS ?? "";
const EXCLUDE_HEADER_MAP = EXCLUDE_HEADERS.split(",").reduce((obj, k) => {
  if (k) obj[k] = true;
  return obj;
}, {});

if (!ADMIN_PASSWORD && NODE_ENV === "production")
  throw new Error("Must specify WTT_ADMIN_PASSWORD");

//
// Shared Express setup
//

const app = express();
app.set("view engine", "pug");
app.use(morgan("combined"));

//
// Webhook router
// Used for responding to generic HTTP requests
//

const webhookRouter = express.Router();
webhookRouter.use(bodyParser.raw({ type: "*/*" }));
webhookRouter.use(requestLogger);
webhookRouter.all("*", (req, res) => {
  runResponderScript(req, res);
});

//
// Admin router
// Used for rendering the admin config pages
//

const adminRouter = express.Router();
adminRouter.use(
  basicAuth({
    users: { [ADMIN_USERNAME]: ADMIN_PASSWORD ?? "admin" },
    challenge: true,
  })
);
adminRouter.use(express.urlencoded({ extended: true }));

adminRouter.use((req, res, next) => {
  const requests = db
    .query(
      `SELECT id, resp_status, req_timestamp, req_method, req_url FROM requests ORDER BY req_timestamp DESC`
    )
    .all() as Partial<WttRequest>[];
  res.locals.requests = requests;
  res.locals.DateTime = DateTime;
  res.locals.Duration = Duration;
  next();
});
adminRouter.use("/__admin", express.static("public"));

adminRouter.get("/__admin", (req, res) => {
  const scripts = db.query(`SELECT * FROM scripts`).all() as WttScript[];
  res.render("index", {
    scripts,
  });
});

// "Server action" form handler
adminRouter.post("/__admin", (req, res) => {
  if (req.body.addrule) {
    db.query(
      `
      INSERT INTO scripts VALUES (
        $id,
        $method,
        $path,
        $code
      )
    `
    ).run({
      $id: randomUUID(),
      $method: req.body.method ?? "GET",
      $path: req.body.path ?? "/",
      $code: req.body.code ?? "null",
    });
  }
  if (req.body.updaterule) {
    db.query(
      `
      UPDATE scripts SET
        method = $method,
        path = $path,
        code = $code
      WHERE id = $id
    `
    ).run({
      $id: req.body.updaterule,
      $method: req.body.method ?? "GET",
      $path: req.body.path ?? "/",
      $code: req.body.code ?? "null",
    });
  }
  if (req.body.deleterule) {
    db.query(
      `
      DELETE FROM scripts WHERE id = $id
    `
    ).run({ $id: req.body.deleterule });
  }
  if (req.body.clearrequests) {
    db.query(
      `
      DELETE FROM requests;
    `
    ).run();
  }
  res.redirect("/__admin");
});

adminRouter.get("/__admin/request/:id", (req, res) => {
  const request = db
    .query(`SELECT * FROM requests WHERE id = $id`)
    .get({ $id: req.params.id }) as WttRequest;
  if (!request) res.redirect("/__admin");
  request.req_body = request.req_body ? Buffer.from(request.req_body) : null;
  request.resp_body = request.resp_body ? Buffer.from(request.resp_body) : null;
  request.req_headers = JSON.parse(request.req_headers) ?? {};
  request.resp_headers = JSON.parse(request.resp_headers) ?? {};
  const parsedJwt = parseJwtBearer(
    request.req_headers?.["authorization"] ?? ""
  );
  let prettyRequest: string | null = null;
  try {
    if (request.req_body) {
      prettyRequest = highlight(
        formatJson(request.req_body, "Prettified request")
      );
    }
  } catch (e) {}
  let prettyResponse: string | null = null;
  try {
    if (request.resp_body) {
      prettyResponse = highlight(
        formatJson(request.resp_body, "Prettified response")
      );
    }
  } catch (e) {}

  res.render("request", {
    request,
    statusCode: request.resp_status ? parseInt(request.resp_status, 10) : 0,
    parsedJwt: parsedJwt
      ? highlight(
          formatJson(parsedJwt.header, "JWT header") +
            "\n\n" +
            formatJson(parsedJwt.payload, "JWT payload")
        )
      : null,
    prettyRequest,
    prettyResponse,
  });
});

// Connect routers
app.use("^(?!/__admin|/favicon.*)", webhookRouter);
app.use(adminRouter);

//
// Program startup
//

console.log(`Using database: ${DB_FILE}`);

const db = new Database(DB_FILE, { create: true });

db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    req_method TEXT,
    req_url TEXT,
    req_headers TEXT,
    req_body BLOB,
    req_timestamp INTEGER NOT NULL,
    resp_status TEXT,
    resp_statusmessage TEXT,
    resp_headers TEXT,
    resp_body BLOB,
    resp_timestamp INTEGER
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    method TEXT,
    path TEXT,
    code TEXT
  ) WITHOUT ROWID;
`);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

//
// helper functions
//

function formatJson(json: string, comment: string) {
  return (
    (comment ? `// ${comment}\n` : "") +
    JSON.stringify(JSON.parse(json), null, 2)
  );
}

function highlight(s: string) {
  return hljs.highlight(s, { language: "javascript" }).value;
}

function parseJwtBearer(bearer: string) {
  const match = bearer?.match(
    /^Bearer ([a-zA-Z0-9+/=]+)\.([a-zA-Z0-9+/=]+)\.(.+)$/
  );
  if (!match) return null;
  const parsed = {
    header: "Couldn't parse header",
    payload: "Couldn't parse payload",
  };
  try {
    parsed.header = JSON.stringify(
      JSON.parse(Buffer.from(match[1], "base64").toString("utf8")),
      null,
      2
    );
  } catch (e) {}
  try {
    parsed.payload = JSON.stringify(
      JSON.parse(Buffer.from(match[2], "base64").toString("utf8")),
      null,
      2
    );
  } catch (e) {}
  return parsed;
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

interface WttScript {
  id: string;
  method: string;
  path: string;
  code: string;
}

interface WttRequest {
  id: string;
  req_method: string;
  req_url: string;
  req_headers: string;
  req_body: Uint8Array | null;
  req_timestamp: number;
  resp_status: string;
  resp_statusmessage: string;
  resp_headers: string;
  resp_body: Uint8Array | null;
  resp_timestamp: number;
}
