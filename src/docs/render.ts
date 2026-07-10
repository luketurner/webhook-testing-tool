import "@/server-only";
import { Marked } from "marked";
import { manualPages } from "./index";

export type ManualPageName = keyof typeof manualPages;

const MANUAL_PAGE_HREF = /^(?:\.\/)?([a-z0-9-]+)\.md$/;

/**
 * Resolves a markdown link href to a manual page name, e.g. `./tls.md` -> `tls`.
 * Returns null for external links, anchors, and links naming no existing page.
 */
export function manualPageFromHref(href: string): ManualPageName | null {
  const page = MANUAL_PAGE_HREF.exec(href)?.[1];
  return page && page in manualPages ? (page as ManualPageName) : null;
}

const marked = new Marked({ gfm: true, breaks: true });

marked.use({
  renderer: {
    link(token) {
      const page = manualPageFromHref(token.href);
      if (!page) return false;
      const text = this.parser.parseInline(token.tokens);
      return `<a href="?manual=${page}" data-manual-page="${page}">${text}</a>`;
    },
  },
});

export async function renderManualPage(markdown: string): Promise<string> {
  return await marked.parse(markdown);
}
