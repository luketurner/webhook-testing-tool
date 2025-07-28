import "@/server-only";
import { $ } from "bun";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { existsSync } from "fs";

export async function assertGeneratedSelfSignedCert(
  certPath: string,
  keyPath: string,
) {
  if (!existsSync(certPath) && !existsSync(keyPath)) {
    console.log(`Generating new self-signed certificate ${certPath}...`);
    await mkdir(dirname(certPath), { recursive: true });
    await mkdir(dirname(keyPath), { recursive: true });
    await $`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`.quiet();
  }
}
