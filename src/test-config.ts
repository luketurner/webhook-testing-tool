import "@/server-only";

export const TEST_PORT = 4123;
export const TEST_SSL_PORT = 4124; // Use a different port for HTTPS testing
export const TEST_CERT_DIR = `${process.cwd()}/test-certs`;

// TODO -- the startWebhookServer should accept these via parameters
// so we don't need to change env vars like this
process.env.WTT_WEBHOOK_PORT = TEST_PORT.toString();
process.env.WTT_WEBHOOK_SSL_PORT = TEST_SSL_PORT.toString();
process.env.WTT_WEBHOOK_SSL_ENABLED = "true";
// Use absolute paths for test certificates
process.env.WTT_WEBHOOK_SSL_CERT_PATH = `${TEST_CERT_DIR}/test-cert.pem`;
process.env.WTT_WEBHOOK_SSL_KEY_PATH = `${TEST_CERT_DIR}/test-key.pem`;
