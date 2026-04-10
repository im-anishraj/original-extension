chrome.storage.local.get(["activeSites"], ({ activeSites }) => {
  const hostname = location.hostname;
  if (!activeSites || !activeSites.includes(hostname)) {
    return; // Do nothing unless blocking is enabled for this site
  }

  const events = [
    "copy",
    "cut",
    "paste",
    "contextmenu",
    "selectstart",
    "mousedown",
  ];

  events.forEach((event) => {
    document.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, true);
  });
  
  // Also hook into keyboard shortcuts like Ctrl+C, Ctrl+V
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "p"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Block links that try to open in a new tab (target="_blank")
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.target === "_blank") {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Block middle-click on links (which automatically opens new tabs)
  document.addEventListener("auxclick", (e) => {
    if (e.button === 1) { // 1 represents the middle mouse button
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
});
