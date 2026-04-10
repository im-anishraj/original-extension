// ============================================
// 1. Block new tab creation when a site is active
// ============================================
chrome.tabs.onCreated.addListener(async (newTab) => {
  chrome.storage.local.get(["activeSites"], async ({ activeSites }) => {
    if (!activeSites || activeSites.length === 0) return;

    try {
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

// ============================================
// 2. Prevent tab switching when a tab is locked
// ============================================
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.storage.local.get(["lockedTabId", "lockedWindowId"], (result) => {
    const lockedTabId = result.lockedTabId;
    const lockedWindowId = result.lockedWindowId;

    // No locked tab or values are null/undefined — allow free switching
    if (lockedTabId === null || lockedTabId === undefined) return;
    if (lockedWindowId === null || lockedWindowId === undefined) return;

    // Only enforce within the same window
    if (activeInfo.windowId !== lockedWindowId) return;

    // If the user switched away from the locked tab, force them back
    if (activeInfo.tabId !== lockedTabId) {
      // Small delay to avoid "Tabs cannot be edited right now" error
      setTimeout(() => {
        forceBackToLockedTab(lockedTabId);
      }, 100);
    }
  });
});

/**
 * Force the user back to the locked tab with retry logic.
 */
function forceBackToLockedTab(lockedTabId, retries = 3) {
  chrome.tabs.get(lockedTabId, (tab) => {
    if (chrome.runtime.lastError) {
      // Locked tab no longer exists — clear the lock
      chrome.storage.local.remove(["lockedTabId", "lockedWindowId"]);
      return;
    }
    chrome.tabs.update(lockedTabId, { active: true }, () => {
      if (chrome.runtime.lastError && retries > 0) {
        // Retry after a short delay
        setTimeout(() => forceBackToLockedTab(lockedTabId, retries - 1), 200);
      }
    });
  });
}

// ============================================
// 3. If the locked tab is closed, clear the lock
// ============================================
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(["lockedTabId"], ({ lockedTabId }) => {
    if (lockedTabId === tabId) {
      chrome.storage.local.remove(["lockedTabId", "lockedWindowId"]);
    }
  });
});

// ============================================
// 4. Prevent switching windows when tab is locked
// ============================================
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  chrome.storage.local.get(["lockedTabId", "lockedWindowId"], (result) => {
    const lockedTabId = result.lockedTabId;
    const lockedWindowId = result.lockedWindowId;

    if (lockedTabId === null || lockedTabId === undefined) return;
    if (lockedWindowId === null || lockedWindowId === undefined) return;

    // If the user switched to a different window, pull them back
    if (windowId !== lockedWindowId) {
      setTimeout(() => {
        chrome.windows.update(lockedWindowId, { focused: true }, () => {
          if (chrome.runtime.lastError) return;
          forceBackToLockedTab(lockedTabId);
        });
      }, 100);
    }
  });
});

// ============================================
// 5. Listen for storage changes to immediately
//    react when lock is set or cleared
// ============================================
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.lockedTabId) {
    console.log("[CopyPasteBlocker] Lock changed:", 
      changes.lockedTabId.oldValue, "->", changes.lockedTabId.newValue);
  }
});
