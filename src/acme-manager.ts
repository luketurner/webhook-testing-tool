import "@/server-only";
import * as acme from "acme-client";
import fs from "fs/promises";
import path from "path";
import {
  ACME_CERT_PATH,
  ACME_DIRECTORY_URL,
  ACME_DOMAINS,
  ACME_EMAIL,
  ACME_STAGING,
} from "@/config";

interface CertificateInfo {
  certificate: string;
  privateKey: string;
  expiresAt: Date;
}

export class AcmeManager {
  private client: acme.Client | null = null;
  private accountKey: string | null = null;
  private challengeResponses = new Map<string, string>();

  async initialize(): Promise<void> {
    if (!ACME_DOMAINS.length || !ACME_EMAIL) {
      throw new Error("ACME_DOMAINS and ACME_EMAIL must be configured");
    }

    await fs.mkdir(ACME_CERT_PATH, { recursive: true });

    // Load or generate account key
    const accountKeyPath = path.join(ACME_CERT_PATH, "account.key");
    try {
      this.accountKey = await fs.readFile(accountKeyPath, "utf8");
    } catch {
      // Generate new account key
      const key = await acme.crypto.createPrivateKey();
      this.accountKey = key.toString();
      await fs.writeFile(accountKeyPath, this.accountKey);
    }

    // Determine directory URL
    const directoryUrl = ACME_STAGING
      ? acme.directory.letsencrypt.staging
      : ACME_DIRECTORY_URL;

    // Create ACME client
    this.client = new acme.Client({
      directoryUrl,
      accountKey: this.accountKey,
    });

    // Create account if needed
    try {
      await this.client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${ACME_EMAIL}`],
      });
    } catch (error: any) {
      if (error.status !== 409) {
        // 409 means account already exists
        throw error;
      }
    }
  }

  // Get active challenge responses for HTTP-01 validation
  getChallengeResponse(token: string): string | undefined {
    return this.challengeResponses.get(token);
  }

  // Request or renew certificate
  async obtainCertificate(): Promise<CertificateInfo> {
    if (!this.client) {
      throw new Error("ACME client not initialized");
    }

    // Check if we have a valid certificate
    const existingCert = await this.loadExistingCertificate();
    if (existingCert && this.isCertificateValid(existingCert)) {
      return existingCert;
    }

    console.log(
      `Obtaining new certificate for domains: ${ACME_DOMAINS.join(", ")}`,
    );

    // Generate certificate key
    const certKeyPath = path.join(ACME_CERT_PATH, "cert.key");
    let certKey: string;
    try {
      certKey = await fs.readFile(certKeyPath, "utf8");
    } catch {
      const key = await acme.crypto.createPrivateKey();
      certKey = key.toString();
      await fs.writeFile(certKeyPath, certKey);
    }

    // Create CSR
    const [key, csr] = await acme.crypto.createCsr({
      altNames: ACME_DOMAINS,
    });

    // Request certificate using auto mode
    const certificate = await this.client.auto({
      csr,
      email: ACME_EMAIL,
      termsOfServiceAgreed: true,
      challengePriority: ["http-01"],
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        console.log(
          `Creating challenge for ${authz.identifier.value}: ${challenge.token}`,
        );
        this.challengeResponses.set(challenge.token, keyAuthorization);
      },
      challengeRemoveFn: async (authz, challenge) => {
        console.log(
          `Removing challenge for ${authz.identifier.value}: ${challenge.token}`,
        );
        this.challengeResponses.delete(challenge.token);
      },
    });

    // Save certificate and key
    const certPath = path.join(ACME_CERT_PATH, "cert.pem");
    const keyPath = path.join(ACME_CERT_PATH, "key.pem");

    const certString = certificate.toString();
    const keyString = key.toString();

    await fs.writeFile(certPath, certString);
    await fs.writeFile(keyPath, keyString);

    const certInfo: CertificateInfo = {
      certificate: certString,
      privateKey: keyString,
      expiresAt: this.getCertificateExpiry(certString),
    };

    console.log(
      `Certificate obtained successfully, expires: ${certInfo.expiresAt}`,
    );

    return certInfo;
  }

  // Load existing certificate if available
  private async loadExistingCertificate(): Promise<CertificateInfo | null> {
    try {
      const certPath = path.join(ACME_CERT_PATH, "cert.pem");
      const keyPath = path.join(ACME_CERT_PATH, "key.pem");

      const [certificate, privateKey] = await Promise.all([
        fs.readFile(certPath, "utf8"),
        fs.readFile(keyPath, "utf8"),
      ]);

      return {
        certificate,
        privateKey,
        expiresAt: this.getCertificateExpiry(certificate),
      };
    } catch {
      return null;
    }
  }

  // Check if certificate is still valid (not expired and has >30 days left)
  private isCertificateValid(certInfo: CertificateInfo): boolean {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    return certInfo.expiresAt > thirtyDaysFromNow;
  }

  // Extract expiry date from certificate
  private getCertificateExpiry(certificate: string): Date {
    const cert = acme.crypto.readCertificateInfo(certificate);
    return new Date(cert.notAfter);
  }

  // Renew certificate if needed
  async renewIfNeeded(): Promise<boolean> {
    const existingCert = await this.loadExistingCertificate();
    if (!existingCert || !this.isCertificateValid(existingCert)) {
      await this.obtainCertificate();
      return true;
    }
    return false;
  }
}

// Singleton instance
export const acmeManager = new AcmeManager();
