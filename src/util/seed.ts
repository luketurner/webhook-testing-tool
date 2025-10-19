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
    body: "iVBORw0KGgoAAAANSUhEUgAAAFEAAAA/CAYAAACYcSQcAAADtklEQVR4Xu2Yv2sUQRzFs1crop1ydxaxUCz9WYqIAf8AFSwFNYJYSAQtUgmKQSwsNMFCBNHYCoFYWAQEg43lFZ6Yu8N0ipj6zveOmWVYdzdm700w8j1Ybndv5s3MZ998v9+9ZMw+IxNIRlYwgTGDKDCBQTSIAgICCXOiQRQQEEiYEw2igIBAwpxoEAUEBBLmRIMoICCQMCcaRAEBgYQ50SAKCAgkzIkGUUBAIGFONIgCAgKJKE5sNBpHkiQ51el07grmWEkCczjHjt1ud76SwAY6RYHYbDbvYw5Tg8HgKBbxcQPzkTUFxA8QO4jxt8tEC4RiQ5zAIt7GXkSePiFiNxzDboiyxnDMKAMETjSIVRwEB5xGvxtwAb9XncZurxV7i9fr9V0Y+zCOZxiT47YwZh3X2zgHnK+pt7jMiQzkmOirAvAt3F/C8bXf78/2er3v2XZMRri3E0cbi2wXbFE+mIs4zgRQzvvkgR0wi98u5fUFvGX0WcL3F7R/UsUgRX1iQaQD6YI5xKTLZRN2mfw52uwP3DoZLtS566Vzt29Gh/3ExbSPux4i3cZGBI3zFLISXKglg0hRAsGk25j8WRyPcV4aE5373jlXzdAlOL9OoDjf5x2JdvPUdHCmypzEcEKovs+WTSxcCBa9CBgzWMTNIgf4DAo4qfMCN6XlEdpd4UNxOnMICbfyQkI4zmYmN6kT/SL+BqKPoc5dC4C0gv47XExrAf6BEIornp+6LbpGqIB5rwjmfwnRxzWAucptCiiLLsZxG08GiWIZbS7kJRdq1Go1xthrjLl8AEUw8yC68HEH2hPK+LhpTvTu9Fs3+0bhSqPCzJxdtNvi0x4mvk+Gb0d5EIN7abxVwIwNcbgtnYPehwkjSBavsfjhe25J7BzHb5/oumyMDeLlKn7b4zU8MFwPK4Qgif0K2/2zEDkxLOIbXZKZZJpo3PZecTGOW/ghjh+4PgS3nuBWZ20HwMcBYBzXn50Wy6c3OFjesHjey8zN8zATZ/qk01ivYqgCNYoTOZGw+MbE+f78IPsezYXi/gu+42YnT4AE6wtp56RHBW1ZF/5R+mTqxgW0uV1UyFeB5/tEg8gB6DZ+r1eOOJgEOvyU/WmRbUv3lv1TxPYxwIXQo0Ic5elupb4GUfC0DKJBFBAQSJgTDaKAgEDCnGgQBQQEEuZEgyggIJAwJxpEAQGBhDnRIAoICCTMiQZRQEAgYU40iAICAglzokEUEBBImBMNooCAQMKcaBAFBAQS5kSDKCAgkPgN8BvlT8qTlvsAAAAASUVORK5CYII=",
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

  // Multipart form data
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  const multipartBody = [
    `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
    `Content-Disposition: form-data; name="username"`,
    ``,
    `john_doe`,
    `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
    `Content-Disposition: form-data; name="email"`,
    ``,
    `john@example.com`,
    `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
    `Content-Disposition: form-data; name="profile_picture"; filename="avatar.jpg"`,
    `Content-Type: image/jpeg`,
    ``,
    `/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`,
    `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
    `Content-Disposition: form-data; name="description"`,
    ``,
    `This is a multipart form submission with text fields and a file upload.`,
    `------WebKitFormBoundary7MA4YWxkTrZu0gW--`,
  ].join("\r\n");

  requests.push({
    id: "multipart_form",
    name: "Multipart Form Upload",
    method: "POST",
    url: "/upload",
    headers: [["content-type", `multipart/form-data; boundary=${boundary}`]],
    query: [],
    body: btoa(multipartBody),
  });

  // XML payload
  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<order>
  <orderId>12345</orderId>
  <customer>
    <name>John Doe</name>
    <email>john.doe@example.com</email>
    <address>
      <street>123 Main St</street>
      <city>Anytown</city>
      <state>CA</state>
      <zip>12345</zip>
    </address>
  </customer><items>
    <item>
      <productId>SKU-001</productId>
      <name>Widget Pro</name>
      <quantity>2</quantity>
      <price>29.99</price>
    </item>
    <item>
      <productId>SKU-002</productId>
      <name>Gadget Plus</name>
      <quantity>1</quantity>
      <price>49.99</price>
    </item>
  </items>
  <total>109.97</total>
  <status>pending</status>
</order>`;

  requests.push({
    id: "xml_order",
    name: "XML Order Request",
    method: "POST",
    url: "/api/orders",
    headers: [["content-type", "application/xml"]],
    query: [],
    body: btoa(xmlPayload),
  });

  // HTML payload
  const htmlPayload = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test HTML Page</title>
</head>
<body>
    <h1>Welcome to the Test Page</h1>
    <p>This is a test HTML payload to verify HTML formatting.</p>
    <div class="container">
        <h2>Features</h2>
        <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
        </ul>
    </div>
    <footer>
        <p>&copy; 2024 Test Company</p>
    </footer>
</body>
</html>`;

  requests.push({
    id: "html_page",
    name: "HTML Page Request",
    method: "POST",
    url: "/page",
    headers: [["accept", "text/html"]],
    query: [],
    body: btoa(htmlPayload),
  });

  return requests;
}

export const seedRequests = await createSeedRequests();
