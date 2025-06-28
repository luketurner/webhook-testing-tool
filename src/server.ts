import "@/server-only";
import { startDashboardServer } from "./dashboard/server";
import { DB_FILE } from "./config-server";
import { migrateDb } from "./db";
import { startWebhookServer } from "./webhook-server";
import { initializeAdminUser } from "./auth/init-user";
import { ADMIN_PORT, WEBHOOK_PORT } from "./config-shared";

console.log(`Using database: ${DB_FILE}`);
await migrateDb();

// Initialize admin user after database migration
await initializeAdminUser();

await startDashboardServer();
console.log(`Admin server listening on port ${ADMIN_PORT}`);

await startWebhookServer();
console.log(`Webook server listening on port ${WEBHOOK_PORT}`);
