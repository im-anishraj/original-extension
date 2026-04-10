chrome.tabs.onCreated.addListener(async (newTab) => {
  chrome.storage.local.get(["activeSites"], async ({ activeSites }) => {
    if (!activeSites || activeSites.length === 0) return;

    try {
      // Check if any open tab in the same window (or globally) matches an active site
      const tabs = await chrome.tabs.query({ windowId: newTab.windowId });
      let hasActiveSite = false;

      for (const tab of tabs) {
        if (tab.id === newTab.id) continue;
        if (tab.url) {
          try {
            const hostname = new URL(tab.url).hostname;
            if (activeSites.includes(hostname)) {
              hasActiveSite = true;
              break;
            }
          } catch (err) {
            // Invalid URL, ignore
          }
        }
      }

      // If an active blocking site is currently open in the same window, immediately close the new tab
      if (hasActiveSite) {
        chrome.tabs.remove(newTab.id);
      }
    } catch (error) {
      console.error("Error checking tabs:", error);
    }
  });
});
