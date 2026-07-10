import "@/server-only";
import {
  TEST_CERT_PATH,
  TEST_KEY_PATH,
  TEST_PORT,
  TEST_SSL_PORT,
  TEST_H2_PORT,
  TEST_TEMP_DIR,
} from "./test-config";

import { migrateDb, resetDb } from "./db";
import { startWebhookServer } from "./webhook-server";
import { beforeAll, afterAll, afterEach } from "bun:test";
import { $ } from "bun";
import http from "http";
import https from "https";
import type { Http2SecureServer } from "node:http2";
import { assertGeneratedSelfSignedCert } from "./util/generate-cert";

let server: http.Server;
let httpsServer: https.Server;
let http2Server: Http2SecureServer | undefined;

beforeAll(async () => {
  await migrateDb();
  await assertGeneratedSelfSignedCert(TEST_CERT_PATH, TEST_KEY_PATH);
  ({ server, httpsServer, http2Server } = await startWebhookServer({
    port: TEST_PORT,
    ssl: {
      enabled: true,
      port: TEST_SSL_PORT,
      certPath: TEST_CERT_PATH,
      keyPath: TEST_KEY_PATH,
    },
    http2: {
      enabled: true,
      port: TEST_H2_PORT,
    },
  }));
});

afterAll(async () => {
  server.close();
  httpsServer?.close();
  http2Server?.close();
  // // Clean up test certificates
  // Disabled because regenerating the certificates before each suite runs is kinda slow.
  // try {
  //   await $`rm -rf ${TEST_TEMP_DIR}`;
  // } catch (err) {
  //   // Ignore cleanup errors
  // }
});

afterEach(() => {
  // AIDEV-NOTE: This resets the DB after each test case. Do not do any additional DB cleanup in afterEach blocks.
  resetDb();
});
