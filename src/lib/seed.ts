import "@/server-only";
import { sendWebhookRequest } from "./sendRequest";

export async function seedRequestData() {
  await sendWebhookRequest({ method: "GET", path: "/simple" });
  await sendWebhookRequest({
    method: "GET",
    path: "/auth_basic",
    headers: [
      [
        "Authorization",
        `Basic ${Buffer.from("testuser:testpass", "utf8").toString("base64")}`,
      ],
    ],
  });
  await sendWebhookRequest({
    method: "GET",
    path: "/auth_bearer",
    headers: [["Authorization", "Bearer test-bearer-token"]],
  });
  await sendWebhookRequest({
    method: "GET",
    path: "/auth_jwt",
    headers: [
      [
        "Authorization",
        `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
      ],
    ],
  });
  await sendWebhookRequest({
    method: "GET",
    path: "/auth_unknown",
    headers: [["Authorization", "MyRandomScheme foobar"]],
  });
  await sendWebhookRequest({
    method: "POST",
    path: "/post_json",
    body: JSON.stringify({ foo: "bar" }),
  });
}
