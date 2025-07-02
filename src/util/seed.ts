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
}
