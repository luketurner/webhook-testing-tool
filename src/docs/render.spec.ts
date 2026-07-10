import { describe, expect, test } from "bun:test";
import { manualPages } from "./index";
import { manualPageFromHref, renderManualPage } from "./render";

describe("manualPageFromHref", () => {
  test("resolves a relative link to a manual page", () => {
    expect(manualPageFromHref("./tls.md")).toBe("tls");
  });

  test("resolves a bare filename to a manual page", () => {
    expect(manualPageFromHref("tls.md")).toBe("tls");
  });

  test("resolves a hyphenated page name", () => {
    expect(manualPageFromHref("./tcp-handlers.md")).toBe("tcp-handlers");
  });

  test("returns null for a page that does not exist", () => {
    expect(manualPageFromHref("./nope.md")).toBeNull();
  });

  test("returns null for external links", () => {
    expect(manualPageFromHref("https://example.com/tls.md")).toBeNull();
    expect(manualPageFromHref("http://example.com")).toBeNull();
    expect(manualPageFromHref("mailto:admin@example.com")).toBeNull();
  });

  test("returns null for anchors and non-markdown paths", () => {
    expect(manualPageFromHref("#acme")).toBeNull();
    expect(manualPageFromHref("./tls.md#acme")).toBeNull();
    expect(manualPageFromHref("../README.md")).toBeNull();
    expect(manualPageFromHref("./wtt_request.png")).toBeNull();
  });
});

describe("renderManualPage", () => {
  test("rewrites a manual page link into a manual query param", async () => {
    const html = await renderManualPage("See [the TLS page](./tls.md).");
    expect(html).toContain(
      `<a href="?manual=tls" data-manual-page="tls">the TLS page</a>`,
    );
  });

  test("renders inline markdown inside a rewritten link", async () => {
    const html = await renderManualPage("[`resp.socket`](./handlers.md)");
    expect(html).toContain(
      `<a href="?manual=handlers" data-manual-page="handlers"><code>resp.socket</code></a>`,
    );
  });

  test("leaves external links untouched", async () => {
    const html = await renderManualPage("[Bun](https://bun.sh)");
    expect(html).toContain(`<a href="https://bun.sh">Bun</a>`);
    expect(html).not.toContain("data-manual-page");
  });

  test("leaves a link to a nonexistent page as a plain anchor", async () => {
    const html = await renderManualPage("[missing](./nope.md)");
    expect(html).toContain(`<a href="./nope.md">missing</a>`);
    expect(html).not.toContain("data-manual-page");
  });

  test("applies gfm tables", async () => {
    const html = await renderManualPage("| a |\n| - |\n| b |");
    expect(html).toContain("<table>");
  });

  test("applies breaks", async () => {
    const html = await renderManualPage("one\ntwo");
    expect(html).toContain("<br>");
  });
});

describe("manual page cross-links", () => {
  const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

  test("every relative markdown link resolves to a real manual page", async () => {
    const broken: string[] = [];

    for (const [name, path] of Object.entries(manualPages)) {
      const markdown = await Bun.file(path).text();
      for (const [, href] of markdown.matchAll(MARKDOWN_LINK)) {
        if (!href.endsWith(".md")) continue;
        if (!manualPageFromHref(href)) broken.push(`${name}.md -> ${href}`);
      }
    }

    expect(broken).toEqual([]);
  });
});
