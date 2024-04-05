import express from 'express';
import morgan from 'morgan';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';
import { randomUUID } from 'crypto';

// global configuration
const PORT = 3000;
const DB_FILE = 'local/data.sqlite';

// request index counter
let index = 1;

const app = express();
app.use(morgan('combined'));

const webhookRouter = express.Router();

app.use('^(?!/__ui|/__api|/favicon.*)', webhookRouter);

webhookRouter.use(bodyParser.raw({ type: '*/*' }));
webhookRouter.use(requestLogger);

app.use('/__ui', express.static('public'));

app.get('/__api/logs', async (req, res) => {
  const rows = await db.all(`SELECT * FROM requests`);
  res.send(rows);
})

webhookRouter.all('*', async (req, res) => {
  const status = singleParam(req, 'responseStatus') ?? 200;

  const respBody = { status };

  res.status(status).send(respBody);
});

console.log(`Using database: ${DB_FILE}`)

const db = await open({
  filename: DB_FILE,
  driver: sqlite3.Database
});

await db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    req_body BLOB,
    req_headers TEXT,
    req_timestamp TEXT,
    resp_body BLOB,
    resp_headers TEXT,
    resp_status TEXT,
    resp_timestamp TEXT
  ) WITHOUT ROWID
`);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

// helper functions

function singleParam(req, p) {
  const v = req?.query?.[p];
  if (Array.isArray(v) && v.length > 0) { return v[0]; }
  return v || null;
}

async function requestLogger(req, res, next) {

  const id = randomUUID();
  
  await db.run(`
    INSERT INTO requests VALUES (
      $id,
      $req_body,
      $req_headers,
      $resp_body,
      $resp_headers,
      $resp_status,
      $req_timestamp,
      $resp_timestamp
    )
  `, {
    $id: id,
    $req_body: req.body instanceof Buffer ? req.body : undefined,
    $req_headers: JSON.stringify(req.headers),
    $req_timestamp: new Date(Date.now()).toString(),
    $resp_body: null,
    $resp_headers: null,
    $resp_status: null,
    $resp_timestamp: null,
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
      SET resp_body = $body, resp_headers = $headers, resp_status = $status, resp_timestamp = $timestamp
      WHERE id = $id
    `, {
      $id: id,
      $body: body,
      $headers: JSON.stringify(res.getHeaders()),
      $status: res.statusCode,
      $timestamp: new Date(Date.now()).toString(),
    });
  };

  next();
}