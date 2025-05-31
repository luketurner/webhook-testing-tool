const baseUrl = "http://localhost:3000";

async function send(
  method: string,
  path: string,
  { query = "", body = undefined, headers = {} } = {}
) {
  const url = new URL(path, baseUrl);
  url.search = new URLSearchParams(query).toString();
  const resp = await fetch(url, {
    method,
    body,
    headers,
  });
}

export async function seed() {
  await send("GET", "/simple");
  await send("GET", "/auth_basic", {
    headers: {
      Authorization: `Basic ${Buffer.from("testuser:testpass", "utf8").toString(
        "base64"
      )}`,
    },
  });
  await send("GET", "/auth_bearer", {
    headers: {
      Authorization: `Bearer test-bearer-token`,
    },
  });
  await send("GET", "/auth_jwt", {
    headers: {
      Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
    },
  });
  await send("GET", "/auth_unknown", {
    headers: {
      Authorization: `MyRandomScheme foobar`,
    },
  });
  await send("POST", "/post_json", { body: JSON.stringify({ foo: "bar" }) });
}

if (import.meta.main) {
  await seed();
}
