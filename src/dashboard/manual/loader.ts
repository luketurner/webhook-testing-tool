// AIDEV-NOTE: Manual page loader - loads markdown files from src/docs via API
// Available pages are determined by the presence of .md files in src/docs/

const availablePages = ["home"]; // AIDEV-TODO: Make this dynamic

export async function loadManualPage(pageName: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/manual/${pageName}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Failed to load manual page: ${pageName}`, error);
    return null;
  }
}

export function getAvailablePages(): string[] {
  return availablePages;
}
