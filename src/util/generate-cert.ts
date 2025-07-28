import "@/server-only";
import { $ } from "bun";
import { SSL_CERT_PATH, SSL_KEY_PATH } from "@/config";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { existsSync } from "fs";

export async function assertGeneratedSelfSignedCert() {
  if (!existsSync(SSL_CERT_PATH) && !existsSync(SSL_KEY_PATH)) {
    console.log(`Generating new self-signed certificate ${SSL_CERT_PATH}...`);
    await mkdir(dirname(SSL_CERT_PATH), { recursive: true });
    await mkdir(dirname(SSL_KEY_PATH), { recursive: true });

    await $`openssl req -x509 -newkey rsa:4096 -keyout ${SSL_KEY_PATH} -out ${SSL_CERT_PATH} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`.quiet();
  }
}
