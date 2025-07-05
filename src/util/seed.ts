import "@/server-only";
import { sendWebhookRequest } from "../webhook-server/send-request";

export async function seedRequestData() {
  await sendWebhookRequest({
    method: "GET",
    url: "/simple",
    headers: [],
    query: [],
    body: null,
  });
  await sendWebhookRequest({
    method: "GET",
    url: "/auth_basic",
    headers: [
      [
        "Authorization",
        `Basic ${Buffer.from("testuser:testpass", "utf8").toString("base64")}`,
      ],
    ],
    query: [],
    body: null,
  });
  await sendWebhookRequest({
    method: "GET",
    url: "/auth_bearer",
    headers: [["Authorization", "Bearer test-bearer-token"]],
    query: [],
    body: null,
  });
  await sendWebhookRequest({
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
  await sendWebhookRequest({
    method: "GET",
    url: "/auth_unknown",
    headers: [["Authorization", "MyRandomScheme foobar"]],
    query: [],
    body: null,
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/post_json",
    headers: [["content-type", "application/json"]],
    query: [],
    body: JSON.stringify({ foo: "bar" }),
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/github_webhook",
    headers: [
      ["content-type", "application/json"],
      ["X-GitHub-Event", "push"],
      ["X-Hub-Signature", "sha1=2fd4e1c67a2d28fced849ee1bb76e7391b93eb12"],
      [
        "X-Hub-Signature-256",
        "sha256=88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2",
      ],
    ],
    query: [],
    body: JSON.stringify({
      ref: "refs/heads/main",
      repository: { name: "test-repo", full_name: "user/test-repo" },
      pusher: { name: "testuser", email: "test@example.com" },
    }),
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/gitea_webhook",
    headers: [
      ["content-type", "application/json"],
      ["X-Gitea-Event", "push"],
      [
        "X-Gitea-Signature",
        "sha256=cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce",
      ],
    ],
    query: [],
    body: JSON.stringify({
      ref: "refs/heads/develop",
      repository: { name: "gitea-repo" },
      commits: [{ message: "Test commit", author: { name: "developer" } }],
    }),
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/hmac_auth",
    headers: [
      [
        "Authorization",
        "HMAC-SHA256 758b8ce7c5f4ce0c3a6c0c3e5d8f6b7a9e2f1c4d6e8f0a1b3c5d7e9f2a4b6c8d",
      ],
      ["content-type", "application/json"],
    ],
    query: [],
    body: JSON.stringify({ data: "secure payload", timestamp: 1640995200 }),
  });
  await sendWebhookRequest({
    method: "POST",
    url: "/custom_signature",
    headers: [
      ["content-type", "application/json"],
      [
        "X-Signature-SHA512",
        "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
      ],
      [
        "X-Custom-Signature",
        "HMAC-SHA1 adc83b19e793491b1c6ea0fd8b46cd9f32e592fc",
      ],
    ],
    query: [],
    body: JSON.stringify({ message: "Hello from custom service" }),
  });
}
