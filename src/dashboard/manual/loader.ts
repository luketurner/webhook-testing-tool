// AIDEV-NOTE: Manual page loader - loads markdown files from src/docs via API
// Available pages are determined dynamically using the useManualPages hook

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
