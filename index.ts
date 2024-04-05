import express from 'express';
import morgan from 'morgan';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';
import { randomUUID } from 'crypto';

// global configuration
const PORT = 3000;
const DB_FILE = 'local/data.sqlite';

const app = express();
app.use(morgan('combined'));

const webhookRouter = express.Router();

app.use('^(?!/__ui|/__api|/favicon.*)', webhookRouter);

webhookRouter.use(bodyParser.raw({ type: '*/*' }));
webhookRouter.use(requestLogger);

webhookRouter.all('*', async (req, res) => {
  res.status(200).send({ status: 200 });
});

app.use('/__ui', express.static('public'));

app.get('/__api/logs', async (req, res) => {
  const rows = await db.all(`SELECT * FROM requests`);
  res.send(rows);
});

console.log(`Using database: ${DB_FILE}`);

const db = await open({
  filename: DB_FILE,
  driver: sqlite3.Database
});

await db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    req_method TEXT,
    req_url TEXT,
    req_headers TEXT,
    req_body BLOB,
    req_timestamp TEXT,
    resp_status TEXT,
    resp_statusmessage TEXT,
    resp_headers TEXT,
    resp_body BLOB,
    resp_timestamp TEXT
  ) WITHOUT ROWID
`);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

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