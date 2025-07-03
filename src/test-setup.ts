// import from test-config first so it can adjust env vars if needed
import { TEST_CERT_DIR, TEST_PORT } from "./test-config";

import { execSync } from "child_process";
import { migrateDb, resetDb } from "./db";
import { startWebhookServer } from "./webhook-server";
import { beforeAll, afterAll, afterEach } from "bun:test";
import { existsSync } from "fs";

let server: any;

beforeAll(async () => {
  await migrateDb();
  // Create test certificates directory
  try {
    execSync(`mkdir -p ${TEST_CERT_DIR}`);

    // Generate test self-signed certificate
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout ${TEST_CERT_DIR}/test-key.pem -out ${TEST_CERT_DIR}/test-cert.pem -days 1 -nodes -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"`,
    );

    // Verify certificates were created
    if (
      !existsSync(process.env.WTT_WEBHOOK_SSL_CERT_PATH!) ||
      !existsSync(process.env.WTT_WEBHOOK_SSL_KEY_PATH!)
    ) {
      throw new Error("Test certificates were not created");
    }
  } catch (err) {
    console.error("Failed to generate test certificates:", err);
    throw err;
  }

  server = await startWebhookServer(TEST_PORT);
});

afterAll(async () => {
  server.close();
  // Clean up test certificates
  try {
    execSync(`rm -rf ${TEST_CERT_DIR}`);
  } catch (err) {
    // Ignore cleanup errors
  }
});

afterEach(() => {
  // AIDEV-NOTE: This resets the DB after each test case. Do not do any additional DB cleanup in afterEach blocks.
  resetDb();
});
