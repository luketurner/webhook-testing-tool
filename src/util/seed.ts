import { generateHMACSignature } from "./authorization";
import type { HandlerRequest } from "@/webhook-server/schema";

export interface SeedRequest extends HandlerRequest {
  id: string;
  name: string;
}

function createSeedRequests(): SeedRequest[] {
  const requests: SeedRequest[] = [];

  // Simple GET request
  requests.push({
    id: "simple",
    name: "Simple GET",
    method: "GET",
    url: "/simple",
    headers: [],
    query: [],
    body: null,
  });

  // Basic auth
  requests.push({
    id: "auth_basic",
    name: "Basic Auth",
    method: "GET",
    url: "/auth_basic",
    headers: [
      [
        "Authorization",
        "Basic dGVzdHVzZXI6dGVzdHBhc3M=", // testuser:testpass
      ],
    ],
    query: [],
    body: null,
  });

  // Bearer token
  requests.push({
    id: "auth_bearer",
    name: "Bearer Token",
    method: "GET",
    url: "/auth_bearer",
    headers: [["Authorization", "Bearer test-bearer-token"]],
    query: [],
    body: null,
  });

  // JWT token
  requests.push({
    id: "auth_jwt",
    name: "JWT Token",
    method: "GET",
    url: "/auth_jwt",
    headers: [
      [
        "Authorization",
        `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
      ],
    ],
    query: [],
    body: null,
  });

  // Unknown auth scheme
  requests.push({
    id: "auth_unknown",
    name: "Unknown Auth",
    method: "GET",
    url: "/auth_unknown",
    headers: [["Authorization", "MyRandomScheme foobar"]],
    query: [],
    body: null,
  });

  // POST with JSON
  requests.push({
    id: "post_json",
    name: "POST JSON",
    method: "POST",
    url: "/post_json",
    headers: [["content-type", "application/json"]],
    query: [],
    body: btoa(JSON.stringify({ foo: "bar" })),
  });

  // GitHub webhook with valid HMAC signatures
  const githubSecret = "github-webhook-secret";
  const githubPayload = JSON.stringify({
    ref: "refs/heads/main",
    repository: { name: "test-repo", full_name: "user/test-repo" },
    pusher: { name: "testuser", email: "test@example.com" },
    secret: githubSecret, // Include secret for testing verification
  });
  const githubSha1 = generateHMACSignature(githubPayload, githubSecret, "sha1");
  const githubSha256 = generateHMACSignature(
    githubPayload,
    githubSecret,
    "sha256",
  );

  requests.push({
    id: "github_webhook",
    name: "GitHub Webhook",
    method: "POST",
    url: "/github_webhook",
    headers: [
      ["content-type", "application/json"],
      ["X-GitHub-Event", "push"],
      ["X-Hub-Signature", `sha1=${githubSha1}`],
      ["X-Hub-Signature-256", `sha256=${githubSha256}`],
    ],
    query: [],
    body: Buffer.from(githubPayload).toString("base64"),
  });

  // Gitea webhook with valid HMAC signature
  const giteaSecret = "gitea-webhook-secret";
  const giteaPayload = JSON.stringify({
    ref: "refs/heads/develop",
    repository: { name: "gitea-repo" },
    commits: [{ message: "Test commit", author: { name: "developer" } }],
    secret: giteaSecret, // Include secret for testing verification
  });
  const giteaSha256 = generateHMACSignature(
    giteaPayload,
    giteaSecret,
    "sha256",
  );

  requests.push({
    id: "gitea_webhook",
    name: "Gitea Webhook",
    method: "POST",
    url: "/gitea_webhook",
    headers: [
      ["content-type", "application/json"],
      ["X-Gitea-Event", "push"],
      ["X-Gitea-Signature", `sha256=${giteaSha256}`],
    ],
    query: [],
    body: Buffer.from(giteaPayload).toString("base64"),
  });

  // HMAC Authorization header with valid signature
  const hmacSecret = "hmac-auth-secret";
  const hmacPayload = JSON.stringify({
    data: "secure payload",
    timestamp: 1640995200,
    secret: hmacSecret, // Include secret for testing verification
  });
  const hmacSignature = generateHMACSignature(
    hmacPayload,
    hmacSecret,
    "sha256",
  );

  requests.push({
    id: "hmac_auth",
    name: "HMAC Auth",
    method: "POST",
    url: "/hmac_auth",
    headers: [
      ["Authorization", `HMAC-SHA256 ${hmacSignature}`],
      ["content-type", "application/json"],
    ],
    query: [],
    body: Buffer.from(hmacPayload).toString("base64"),
  });

  // Custom signature headers with valid signatures
  const customSecret = "custom-service-secret";
  const customPayload = JSON.stringify({
    message: "Hello from custom service",
    secret: customSecret, // Include secret for testing verification
  });
  const customSha512 = generateHMACSignature(
    customPayload,
    customSecret,
    "sha512",
  );
  const customSha1 = generateHMACSignature(customPayload, customSecret, "sha1");

  requests.push({
    id: "custom_signature",
    name: "Custom Signature",
    method: "POST",
    url: "/custom_signature",
    headers: [
      ["content-type", "application/json"],
      ["X-Signature-SHA512", `sha512=${customSha512}`],
      ["X-Custom-Signature", `HMAC-SHA1 ${customSha1}`],
    ],
    query: [],
    body: Buffer.from(customPayload).toString("base64"),
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/binary_pdf",
    headers: [["content-type", "application/pdf"]],
    query: [],
    body: "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo1MCA3MDAgVGQKKEhlbGxvIFdvcmxkKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwvRm9udCA8PC9GMSA2IDAgUj4+Pj4KZW5kb2JqCjYgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvVGltZXMtUm9tYW4+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDEyMSAwMDAwMCBuCjAwMDAwMDAyMjkgMDAwMDAgbgowMDAwMDAwMzIzIDAwMDAwIG4KMDAwMDAwMDM2NSAwMDAwMCBuCnRyYWlsZXIKPDwvU2l6ZSA3L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDM1CiUlRU9GCg==",
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/upload_image",
    headers: [["content-type", "image/png"]],
    query: [],
    body: "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAjSURBVAiZY2RgYPjPAAQMDAwMjEwMDIzMDAwM/1kYGBiZAAAARgAF/I7j+QAAAABJRU5ErkJggg==",
  });

  return requests;
}

export const seedRequests = createSeedRequests();
