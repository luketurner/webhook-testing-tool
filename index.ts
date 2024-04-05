import express from 'express';
import morgan from 'morgan';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';
import { randomUUID } from 'crypto';
import basicAuth from 'express-basic-auth';
import { DateTime } from 'luxon';
import { runInNewContext } from 'vm';

// global configuration
const PORT = 3000;
const DB_FILE = 'local/data.sqlite';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.WT_ADMIN_PASSWORD;
const NODE_ENV = process.env.NODE_ENV;

if (!ADMIN_PASSWORD && NODE_ENV === 'production') throw new Error('Must specify WT_ADMIN_PASSWORD');

const app = express();
app.set('view engine', 'pug');
app.use(morgan('combined'));

const webhookRouter = express.Router();
webhookRouter.use(bodyParser.raw({ type: '*/*' }));
webhookRouter.use(requestLogger);
webhookRouter.all('*', async (req, res) => {
  await runResponderScript(req, res);
});

const adminRouter = express.Router();
adminRouter.use(basicAuth({
  users: { [ADMIN_USERNAME]: ADMIN_PASSWORD ?? 'admin' },
  challenge: true
}));

adminRouter.use(async (req, res, next) => {
  const requests = await db.all(`SELECT id, resp_status, req_timestamp, req_method, req_url FROM requests ORDER BY req_timestamp DESC`);
  res.locals.requests = requests;
  res.locals.DateTime = DateTime;
  next();
});
adminRouter.use('/__admin', express.static('public'));
adminRouter.get('/__admin', async (req, res) => {
  res.render('index');
});

adminRouter.get('/__admin/request/:id', async (req, res) => {
  const request = await db.get(`SELECT * FROM requests WHERE id = $id`, { $id: req.params.id });
  if (!request) res.redirect('/__admin');
  request.req_headers = JSON.parse(request.req_headers) ?? {};
  request.resp_headers = JSON.parse(request.resp_headers) ?? {};
  res.render('request', {
    request
  });
});

app.use('^(?!/__admin|/favicon.*)', webhookRouter);
app.use(adminRouter);


console.log(`Using database: ${DB_FILE}`);

const db = await open({
  filename: DB_FILE,
  driver: sqlite3.Database
});

await db.exec(`
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

async function runResponderScript(req, res) {
  const scripts = await db.all(`
    SELECT id, method, path FROM scripts;
  `);

  const matchingScript = scripts.filter(s =>
    (s.method === req.method || s.method === '*') &&
    (req.originalUrl.startsWith(s.path) || s.path === '*')
  ).sort((s1, s2) => {
    if (s1.path === '*' && s2.path !== '*') return 1;
    if (s1.path !== '*' && s2.path === '*') return -1;

    if (s1.path.length < s2.path.length) return 1;
    if (s1.path.length > s2.path.length) return -1;

    if (s1.method === '*' && s2.method !== '*') return 1;
    if (s1.method !== '*' && s2.method === '*') return -1;
    return 0;
  })[0];

  const script = matchingScript?.id ? await db.get(`
    SELECT code FROM scripts WHERE id = $id;
  `, { $id: matchingScript.id }) : null;

  const code = script?.code ?? 'null';
  const result = runInNewContext(code, {
    // JSON,
    req: {
      params: req.params,
      query: req.query,
      headers: req.headers,
      body: req.body,
      originalUrl: req.originalUrl,
      method: req.method
    }
  });
  const responseStatus = typeof result?.status === 'number' ? result.status : 200;
  res.status(responseStatus);
  for (const [k, v] of Object.entries(result?.headers ?? {})) {
    res.setHeader(k, v);
  }
  res.send(result?.body === undefined ? { status: responseStatus } : result.body);
}

async function requestLogger(req, res, next) {

  const id = randomUUID();
  
  await db.run(`
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
  `, {
    $id: id,
    $method: req.method,
    $url: req.originalUrl,
    $headers: JSON.stringify(req.headers),
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

    db.run(`
      UPDATE requests
      SET
        resp_status = $status,
        resp_statusmessage = $statusMessage,
        resp_headers = $headers,
        resp_body = $body,
        resp_timestamp = $timestamp
      WHERE id = $id
    `, {
      $id: id,
      $status: res.statusCode,
      $statusMessage: res.statusMessage,
      $headers: JSON.stringify(res.getHeaders()),
      $body: body,
      $timestamp: Date.now(),
    }).catch(e => console.log(e));
  };

  next();
}