(() => {
  let observer = null;
  let lastHandled = 0;  // 10‑second debounce for scroll action

  // click banner or smooth‑scroll
  const clickBannerOrScroll = () => {
    const now = Date.now();
    if (now - lastHandled < 10_000) return;
    lastHandled = now;

    const bannerBtn = document.querySelector(
      'div[role="button"][data-testid="cellInnerDiv"], ' +
      'div[role="button"][aria-label*="See new"], ' +
      'div[role="button"][data-testid="toast"]'
    );
    if (bannerBtn) {
      bannerBtn.click();
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // (re)arm observer on the timeline node
  const armObserver = () => {
    if (observer) observer.disconnect();
    const timeline = document.querySelector('main section[role="region"]');
    if (!timeline) return;

    observer = new MutationObserver((muts) => {
      if (document.hidden) return;
      if (muts.some((m) => m.addedNodes.length)) clickBannerOrScroll();
    });
    observer.observe(timeline, { childList: true, subtree: true });
  };

  // Throttled SPA‑route watcher — re‑arm when timeline section is replaced
  let rearmTO;
  new MutationObserver(() => {
    clearTimeout(rearmTO);
    rearmTO = setTimeout(armObserver, 500);  // wait 0.5 s for DOM stabilize
  }).observe(document.body, { childList: true, subtree: true });

  // Initial arm
  chrome.storage.sync.get({ isEnabled: true }, (s) => s.isEnabled && armObserver());

  // React to toggle changes
  chrome.storage.onChanged.addListener((_, area) => {
    if (area !== 'sync') return;
    chrome.storage.sync.get({ isEnabled: true }, (s) => {
      if (!s.isEnabled && observer) {
        observer.disconnect();
        observer = null;
      } else if (s.isEnabled) {
        armObserver();
      }
    });
  });
})();