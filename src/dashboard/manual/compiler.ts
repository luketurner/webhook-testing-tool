import { marked } from "marked";

// AIDEV-NOTE: This compiler converts Markdown manual pages to HTML
// It uses the marked library for Markdown parsing

export async function compileManualPage(markdown: string): Promise<string> {
  const html = await marked(markdown, {
    breaks: true,
    gfm: true,
  });

  return html;
}

export async function loadManualPage(pageName: string): Promise<string | null> {
  try {
    // AIDEV-TODO: In production, this should load from compiled pages
    const module = await import(`./pages/${pageName}.md`);
    const markdown = module.default || module;
    return await compileManualPage(markdown);
  } catch (error) {
    console.error(`Failed to load manual page: ${pageName}`, error);
    return null;
  }
}
