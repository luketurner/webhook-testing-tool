import "@/server-only";
import { resolve } from "path";

export const TEST_PORT = 4123;
export const TEST_SSL_PORT = 4124; // Use a different port for HTTPS testing
export const TEST_TEMP_DIR = resolve(import.meta.dir, "../local/test");
export const TEST_CERT_PATH = `${TEST_TEMP_DIR}/test-cert.pem`;
export const TEST_KEY_PATH = `${TEST_TEMP_DIR}/test-key.pem`;
