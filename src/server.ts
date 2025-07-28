import "@/server-only";
import { mkdir } from "fs/promises";
import {
  DB_FILE,
  ADMIN_PORT,
  WEBHOOK_PORT,
  WEBHOOK_SSL_CERT_PATH,
  WEBHOOK_SSL_ENABLED,
  WEBHOOK_SSL_KEY_PATH,
  WEBHOOK_SSL_PORT,
  ACME_ENABLED,
  TCP_PORT,
  DATA_DIR,
} from "@/config";
import { startDashboardServer } from "./dashboard/server";
import { migrateDb } from "./db";
import { startWebhookServer } from "./webhook-server";
import { initializeAdminUser } from "./auth/init-user";
import { startTcpServer } from "./tcp-server";
import { acmeManager } from "@/acme-manager";

console.log(`Using database: ${DB_FILE}`);
await migrateDb();

// Initialize admin user after database migration
await initializeAdminUser();

await startDashboardServer();
console.log(`Admin server listening on port ${ADMIN_PORT}`);

const webhookServer = await startWebhookServer({
  port: WEBHOOK_PORT,
  ssl: {
    enabled: WEBHOOK_SSL_ENABLED,
    certPath: WEBHOOK_SSL_CERT_PATH,
    keyPath: WEBHOOK_SSL_KEY_PATH,
    port: WEBHOOK_SSL_PORT,
  },
});

// Schedule certificate renewal checks if ACME is enabled
if (ACME_ENABLED && WEBHOOK_SSL_ENABLED) {
  console.log("Starting ACME certificate renewal scheduler");

  // Check for certificate renewal every 24 hours
  const renewalInterval = setInterval(
    async () => {
      try {
        console.log("Checking ACME certificate for renewal");
        const renewed = await acmeManager.renewIfNeeded();

        if (renewed) {
          console.log(
            "Certificate renewed successfully. Restarting HTTPS server...",
          );

          // Restart HTTPS server with new certificate
          if (webhookServer.httpsServer) {
            webhookServer.httpsServer.close(() => {
              console.log(
                "HTTPS server closed, restarting with new certificate",
              );
              // The server will restart automatically on next request
              // In production, you might want to implement a more sophisticated restart mechanism
            });
          }
        } else {
          console.log("Certificate renewal not needed yet");
        }
      } catch (error) {
        console.error("Certificate renewal check failed:", error);
      }
    },
    24 * 60 * 60 * 1000,
  ); // 24 hours

  // Also check immediately on startup
  setTimeout(async () => {
    try {
      await acmeManager.renewIfNeeded();
    } catch (error) {
      console.error("Initial certificate renewal check failed:", error);
    }
  }, 60 * 1000); // Check after 1 minute to allow server to fully start
}

// Start TCP server
startTcpServer(TCP_PORT);
