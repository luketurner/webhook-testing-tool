import "@/server-only";
import { startAdminServer } from "./adminServer";
import { DB_FILE } from "./config-server";
import { migrateDb } from "./db";
import { startWebhookServer } from "./webhookServer";
import { ADMIN_PORT, WEBHOOK_PORT } from "./config-shared";

console.log(`Using database: ${DB_FILE}`);
await migrateDb();

startAdminServer();
console.log(`Admin server listening on port ${ADMIN_PORT}`);

await startWebhookServer();
console.log(`Webook server listening on port ${WEBHOOK_PORT}`);
