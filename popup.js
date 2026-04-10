let timerInterval = null;

document.addEventListener("DOMContentLoaded", async () => {
  const loadingState = document.getElementById("loadingState");
  const contentArea = document.getElementById("contentArea");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Handle cases where URL is not accessible (e.g., chrome:// pages)
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      loadingState.style.display = "none";
      contentArea.style.display = "block";
      document.getElementById("siteName").textContent = "Unsupported page";
      document.getElementById("statusText").textContent = "N/A";
      document.getElementById("toggleBtn").disabled = true;
      document.getElementById("toggleBtn").textContent = "Not available on this page";
      document.getElementById("toggleBtn").style.opacity = "0.5";
      document.getElementById("toggleBtn").style.cursor = "not-allowed";
      return;
    }

    const hostname = new URL(tab.url).hostname;

    chrome.storage.local.get(["activeSites", "siteTimers"], ({ activeSites = [], siteTimers = {} }) => {
      const isEnabled = activeSites.includes(hostname);

      // Hide loading, show content
      loadingState.style.display = "none";
      contentArea.style.display = "block";

      // Update site name
      document.getElementById("siteName").textContent = hostname;

      // Update status
      updateStatusUI(isEnabled);

      // Update timer
      if (isEnabled && siteTimers[hostname]) {
        showTimer(siteTimers[hostname]);
      }

      // Toggle button click handler
      document.getElementById("toggleBtn").addEventListener("click", () => {
        let updatedList;
        const updatedTimers = { ...siteTimers };

        if (isEnabled) {
          // Disabling — remove site, its timer, and unlock the tab
          updatedList = activeSites.filter((site) => site !== hostname);
          delete updatedTimers[hostname];

          // First remove the lock keys, then update the rest
          chrome.storage.local.remove(["lockedTabId", "lockedWindowId"], () => {
            chrome.storage.local.set(
              { activeSites: updatedList, siteTimers: updatedTimers },
              () => {
                chrome.tabs.reload(tab.id);
                window.close();
              }
            );
          });
          return; // exit early since we handle everything above
        } else {
          // Enabling — add site, record activation timestamp, and lock to this tab
          updatedList = [...activeSites, hostname];
          updatedTimers[hostname] = Date.now();

          chrome.storage.local.set(
            {
              activeSites: updatedList,
              siteTimers: updatedTimers,
              lockedTabId: tab.id,
              lockedWindowId: tab.windowId,
            },
            () => {
              chrome.tabs.reload(tab.id);
              window.close();
            }
          );
        }
      });
    });
  } catch (error) {
    console.error("Popup error:", error);
    loadingState.style.display = "none";
    contentArea.style.display = "block";
    document.getElementById("siteName").textContent = "Error loading";
  }
});

/**
 * Update the status UI elements based on whether blocking is enabled.
 */
function updateStatusUI(isEnabled) {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const statusCard = document.getElementById("statusCard");
  const toggleBtn = document.getElementById("toggleBtn");

  if (isEnabled) {
    statusDot.classList.add("active");
    statusText.classList.add("active");
    statusText.textContent = "Active";
    statusCard.classList.add("active");
    toggleBtn.textContent = "Disable Protection";
    toggleBtn.className = "disable";
  } else {
    statusDot.classList.remove("active");
    statusText.classList.remove("active");
    statusText.textContent = "Inactive";
    statusCard.classList.remove("active");
    toggleBtn.textContent = "Enable Protection";
    toggleBtn.className = "enable";
  }
}

/**
 * Show the timer section and start updating it every second.
 * @param {number} startTimestamp - The timestamp (ms) when blocking was activated.
 */
function showTimer(startTimestamp) {
  const timerSection = document.getElementById("timerSection");
  const timerDisplay = document.getElementById("timerDisplay");
  const timerSub = document.getElementById("timerSub");

  // Show timer section with animation
  requestAnimationFrame(() => {
    timerSection.classList.add("visible");
  });

  // Format the start time for the subtitle
  const startDate = new Date(startTimestamp);
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  timerSub.textContent = `Started at ${timeStr}`;

  // Update timer immediately, then every second
  function updateTimer() {
    const elapsed = Date.now() - startTimestamp;
    timerDisplay.textContent = formatElapsed(elapsed);
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Format milliseconds into HH:MM:SS string.
 * @param {number} ms - Elapsed time in milliseconds.
 * @returns {string} Formatted time string.
 */
function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

// Clean up interval when popup closes
window.addEventListener("unload", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
