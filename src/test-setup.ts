import "@/server-only";
import {
  TEST_CERT_PATH,
  TEST_KEY_PATH,
  TEST_PORT,
  TEST_SSL_PORT,
  TEST_TEMP_DIR,
} from "./test-config";

import { migrateDb, resetDb } from "./db";
import { startWebhookServer } from "./webhook-server";
import { beforeAll, afterAll, afterEach } from "bun:test";
import { existsSync } from "fs";
import { $ } from "bun";
import http from "http";
import https from "https";

let server: http.Server;
let httpsServer: https.Server;

beforeAll(async () => {
  await migrateDb();
  // Create test certificates directory
  try {
    await $`mkdir -p ${TEST_TEMP_DIR}`;

    // Generate test self-signed certificate
    await $`openssl req -x509 -newkey rsa:2048 -keyout ${TEST_KEY_PATH} -out ${TEST_CERT_PATH} -days 1 -nodes -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"`;

    // Verify certificates were created
    if (!existsSync(TEST_CERT_PATH) || !existsSync(TEST_KEY_PATH)) {
      throw new Error("Test certificates were not created");
    }
  } catch (err) {
    console.error("Failed to generate test certificates:", err);
    throw err;
  }

  ({ server, httpsServer } = await startWebhookServer({
    port: TEST_PORT,
    ssl: {
      enabled: true,
      port: TEST_SSL_PORT,
      certPath: TEST_CERT_PATH,
      keyPath: TEST_KEY_PATH,
    },
  }));
});

afterAll(async () => {
  server.close();
  httpsServer?.close();
  // Clean up test certificates
  try {
    await $`rm -rf ${TEST_TEMP_DIR}`;
  } catch (err) {
    // Ignore cleanup errors
  }
});

afterEach(() => {
  // AIDEV-NOTE: This resets the DB after each test case. Do not do any additional DB cleanup in afterEach blocks.
  resetDb();
});
