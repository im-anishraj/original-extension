document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;

  chrome.storage.local.get(["activeSites"], ({ activeSites = [] }) => {
    const isEnabled = activeSites.includes(hostname);
    document.getElementById("status").textContent = isEnabled
      ? `Blocking Active on ${hostname}`
      : `Blocking Inactive on ${hostname}`;

    toggleBtn.textContent = isEnabled
      ? "Disable blocking on this site"
      : "Enable blocking on this site";

    toggleBtn.addEventListener("click", () => {
      const updatedList = isEnabled
        ? activeSites.filter((site) => site !== hostname)
        : [...activeSites, hostname];

      chrome.storage.local.set({ activeSites: updatedList }, () => {
        chrome.tabs.reload(tab.id);
        window.close();
      });
    });
  });
});
