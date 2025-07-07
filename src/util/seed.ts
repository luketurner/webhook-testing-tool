import { generateHMACSignature } from "./hmac";
import type { HandlerRequest } from "@/webhook-server/schema";

export interface SeedRequest extends HandlerRequest {
  id: string;
  name: string;
}

async function createSeedRequests(): Promise<SeedRequest[]> {
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

  // Digest auth
  requests.push({
    id: "auth_digest",
    name: "Digest Auth",
    method: "GET",
    url: "/auth_digest",
    headers: [
      [
        "Authorization",
        'Digest username="admin", realm="Protected Area", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="/auth_digest", qop=auth, nc=00000001, cnonce="0a4f113b", response="6629fae49393a05397450978507c4ef1", opaque="5ccc069c403ebaf9f0171e9517f40e41", algorithm=MD5',
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
  const githubSha1 = await generateHMACSignature(
    githubPayload,
    githubSecret,
    "sha1",
  );
  const githubSha256 = await generateHMACSignature(
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
    body: btoa(githubPayload),
  });

  // Gitea webhook with valid HMAC signature
  const giteaSecret = "gitea-webhook-secret";
  const giteaPayload = JSON.stringify({
    ref: "refs/heads/develop",
    repository: { name: "gitea-repo" },
    commits: [{ message: "Test commit", author: { name: "developer" } }],
    secret: giteaSecret, // Include secret for testing verification
  });
  const giteaSha256 = await generateHMACSignature(
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
    body: btoa(giteaPayload),
  });

  // HMAC Authorization header with valid signature
  const hmacSecret = "hmac-auth-secret";
  const hmacPayload = JSON.stringify({
    data: "secure payload",
    timestamp: 1640995200,
    secret: hmacSecret, // Include secret for testing verification
  });
  const hmacSignature = await generateHMACSignature(
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
    body: btoa(hmacPayload),
  });

  // Custom signature headers with valid signatures
  const customSecret = "custom-service-secret";
  const customPayload = JSON.stringify({
    message: "Hello from custom service",
    secret: customSecret, // Include secret for testing verification
  });
  const customSha512 = await generateHMACSignature(
    customPayload,
    customSecret,
    "sha512",
  );
  const customSha1 = await generateHMACSignature(
    customPayload,
    customSecret,
    "sha1",
  );

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
    body: btoa(customPayload),
  });

  requests.push({
    id: "simple_pdf",
    name: "Simple PDF",
    method: "POST",
    url: "/binary_pdf",
    headers: [["content-type", "application/pdf"]],
    query: [],
    body: "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo1MCA3MDAgVGQKKEhlbGxvIFdvcmxkKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwvRm9udCA8PC9GMSA2IDAgUj4+Pj4KZW5kb2JqCjYgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvVGltZXMtUm9tYW4+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDEyMSAwMDAwMCBuCjAwMDAwMDAyMjkgMDAwMDAgbgowMDAwMDAwMzIzIDAwMDAwIG4KMDAwMDAwMDM2NSAwMDAwMCBuCnRyYWlsZXIKPDwvU2l6ZSA3L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDM1CiUlRU9GCg==",
  });

  requests.push({
    id: "png_image",
    name: "PNG image",
    method: "POST",
    url: "/upload_image",
    headers: [["content-type", "image/png"]],
    query: [],
    body: "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAjSURBVAiZY2RgYPjPAAQMDAwMjEwMDIzMDAwM/1kYGBiZAAAARgAF/I7j+QAAAABJRU5ErkJggg==",
  });

  requests.push({
    id: "long_strings",
    name: "Request with long strings",
    method: "POST",
    url: "/rosesareredvioletsareblueihatelayouterrorsfromlonglinesbutiloveyou",
    headers: [
      [
        "thisisasuperlongheadernameI'mwritingstreamofconsciousnessrightnow",
        "andthisisavaluefortheheaderinwhichI'llembedaproofaboutP!=NPohwaitIranoutofspaceinthemargin",
      ],
    ],
    query: [
      [
        "absurdlylongquerystringnameIguesswhatelsecanIputinherewhoknows",
        "thisisalsoaparticularlylongvalueforaquerystringhopefullyitlooksfine",
      ],
    ],
    body: null,
  });

  // Form-encoded data
  const formData = new URLSearchParams({
    username: "john_doe",
    email: "john@example.com",
    password: "secret123",
    remember_me: "true",
    subscription_tier: "premium",
    interests: "coding,music,travel",
    age: "28",
    country: "United States",
  });

  requests.push({
    id: "form_data",
    name: "Form Data Submission",
    method: "POST",
    url: "/contact_form",
    headers: [["content-type", "application/x-www-form-urlencoded"]],
    query: [],
    body: btoa(formData.toString()),
  });

  return requests;
}

export const seedRequests = await createSeedRequests();
