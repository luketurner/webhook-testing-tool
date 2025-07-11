import "@/server-only";
import { startDashboardServer } from "./dashboard/server";
import { migrateDb } from "./db";
import { startWebhookServer } from "./webhook-server";
import { initializeAdminUser } from "./auth/init-user";
import {
  DB_FILE,
  ADMIN_PORT,
  WEBHOOK_PORT,
  WEBHOOK_SSL_CERT_PATH,
  WEBHOOK_SSL_ENABLED,
  WEBHOOK_SSL_KEY_PATH,
  WEBHOOK_SSL_PORT,
} from "@/config";

console.log(`Using database: ${DB_FILE}`);
await migrateDb();

// Initialize admin user after database migration
await initializeAdminUser();

await startDashboardServer();
console.log(`Admin server listening on port ${ADMIN_PORT}`);

await startWebhookServer({
  port: WEBHOOK_PORT,
  ssl: {
    enabled: WEBHOOK_SSL_ENABLED,
    certPath: WEBHOOK_SSL_CERT_PATH,
    keyPath: WEBHOOK_SSL_KEY_PATH,
    port: WEBHOOK_SSL_PORT,
  },
});
