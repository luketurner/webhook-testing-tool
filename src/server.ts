import { startAdminServer } from "./adminServer";
import { ADMIN_PORT, DB_FILE, WEBHOOK_PORT } from "./config";
import { migrateDb } from "./db";
import { startWebhookServer } from "./webhookServer";

console.log(`Using database: ${DB_FILE}`);
migrateDb();

startAdminServer();
console.log(`Admin server listening on port ${ADMIN_PORT}`);

await startWebhookServer();
console.log(`Webook server listening on port ${WEBHOOK_PORT}`);
