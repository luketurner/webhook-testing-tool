import "@/server-only";
import { resolve } from "path";
import { findAvailablePorts } from "@/util/port-finder";

export const [TEST_PORT, TEST_SSL_PORT] = await findAvailablePorts(
  4000,
  5000,
  2,
);
export const TEST_TEMP_DIR = resolve(import.meta.dir, "../local/test");
export const TEST_CERT_PATH = `${TEST_TEMP_DIR}/test-cert.pem`;
export const TEST_KEY_PATH = `${TEST_TEMP_DIR}/test-key.pem`;
