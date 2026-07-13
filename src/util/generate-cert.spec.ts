import "@/server-only";
import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { assertGeneratedSelfSignedCert } from "./generate-cert";

const WORK_DIR = join(tmpdir(), "wtt-generate-cert-spec");
const certPath = join(WORK_DIR, "cert.pem");
const keyPath = join(WORK_DIR, "key.pem");

const SENTINEL = "not-a-real-pem";

beforeEach(() => {
  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(WORK_DIR, { recursive: true, force: true });
});

describe("assertGeneratedSelfSignedCert", () => {
  it("generates both files when neither exists", async () => {
    await assertGeneratedSelfSignedCert(certPath, keyPath);

    expect(existsSync(certPath)).toBe(true);
    expect(existsSync(keyPath)).toBe(true);
  });

  it("generates the missing key when only the cert exists", async () => {
    writeFileSync(certPath, SENTINEL);

    await assertGeneratedSelfSignedCert(certPath, keyPath);

    // The key must be created so startup does not later crash reading it.
    expect(existsSync(keyPath)).toBe(true);
    // A fresh, matching pair must be written, replacing the orphaned cert.
    expect(readFileSync(certPath, "utf8")).not.toBe(SENTINEL);
  });

  it("generates the missing cert when only the key exists", async () => {
    writeFileSync(keyPath, SENTINEL);

    await assertGeneratedSelfSignedCert(certPath, keyPath);

    expect(existsSync(certPath)).toBe(true);
    expect(readFileSync(keyPath, "utf8")).not.toBe(SENTINEL);
  });

  it("leaves an existing complete pair untouched", async () => {
    writeFileSync(certPath, SENTINEL);
    writeFileSync(keyPath, SENTINEL);

    await assertGeneratedSelfSignedCert(certPath, keyPath);

    expect(readFileSync(certPath, "utf8")).toBe(SENTINEL);
    expect(readFileSync(keyPath, "utf8")).toBe(SENTINEL);
  });
});
