import { marked } from "marked";

// AIDEV-NOTE: Manual page registry - add new pages here
const manualPages: Record<string, string> = {
  home: `# Welcome to Webhook Testing Tool

Welcome to the WTT manual! This documentation will help you understand and use all the features of the Webhook Testing Tool.

## Quick Start

1. **Create a webhook endpoint** - Navigate to the Dashboard and click "Create Endpoint"
2. **Send test requests** - Use the generated URL to send HTTP requests
3. **View request details** - See all incoming requests in real-time

## Features

- Real-time request monitoring
- Request/response inspection
- Multiple endpoint support
- TLS information display
- Export capabilities

## Navigation

Use the sidebar to navigate through different sections of this manual.`,
};

export async function loadManualPage(pageName: string): Promise<string | null> {
  const markdown = manualPages[pageName];
  if (!markdown) {
    return null;
  }

  try {
    const html = await marked(markdown, {
      breaks: true,
      gfm: true,
    });
    return html;
  } catch (error) {
    console.error(`Failed to parse manual page: ${pageName}`, error);
    return null;
  }
}

export function getAvailablePages(): string[] {
  return Object.keys(manualPages);
}
