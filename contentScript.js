(() => {
  console.log('[X Auto Scroll] Content script loaded');
  let observer = null;
  let lastHandled = 0;  // 10‑second debounce for scroll action

  // play beep sound - try multiple methods
  const playBeep = () => {
    // Method 1: Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('[X Auto Scroll] Web Audio API failed:', e);
    }

    // Method 2: HTML5 Audio with data URI
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ');
      audio.volume = 0.1;
      audio.play().catch(e => console.log('[X Auto Scroll] HTML5 Audio failed:', e));
    } catch (e) {
      console.log('[X Auto Scroll] HTML5 Audio creation failed:', e);
    }

    // Method 3: System beep fallback
    try {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance('\u0007'));
    } catch (e) {
      console.log('[X Auto Scroll] Speech synthesis beep failed:', e);
    }
  };

  // smooth scroll only
  const scrollToTop = () => {
    const now = Date.now();
    if (now - lastHandled < 10_000) {
      console.log('[X Auto Scroll] Debounced - too soon since last action');
      return;
    }
    lastHandled = now;

    playBeep();
    console.log('playBeep() called');

    console.log('[X Auto Scroll] Scrolling to top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // (re)arm observer on the timeline node
  const armObserver = () => {
    if (observer) observer.disconnect();
    
    // Try multiple selectors for timeline
    const timelineSelectors = [
      'main section[role="region"]',
      'main [data-testid="primaryColumn"] section',
      'main div[role="main"] section',
      '[data-testid="primaryColumn"]',
      'main section'
    ];
    
    let timeline = null;
    for (const selector of timelineSelectors) {
      timeline = document.querySelector(selector);
      if (timeline) {
        console.log('[X Auto Scroll] Found timeline with selector:', selector, timeline);
        break;
      }
    }
    
    if (!timeline) {
      console.log('[X Auto Scroll] Timeline not found with any selector, retrying in 1s');
      setTimeout(armObserver, 1000);
      return;
    }

    observer = new MutationObserver((muts) => {
      if (document.hidden) {
        console.log('[X Auto Scroll] Document hidden, ignoring mutations');
        return;
      }
      const hasNewNodes = muts.some((m) => m.addedNodes.length);
      if (hasNewNodes) {
        // Check if there's a "Show X posts" element
        const showPostsElement = document.querySelector('span');
        let foundShowPosts = false;
        
        if (showPostsElement) {
          const allSpans = document.querySelectorAll('span');
          for (const span of allSpans) {
            const text = span.textContent;
            if (text && /^Show \d+ posts?$/.test(text.trim())) {
              console.log('[X Auto Scroll] Found "Show X posts" element:', text);
              foundShowPosts = true;
              break;
            }
          }
        }
        
        if (foundShowPosts) {
          console.log('[X Auto Scroll] New posts detected, triggering action');
          scrollToTop();
        }
      }
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
  chrome.storage.sync.get({ isEnabled: true }, (s) => {
    console.log('[X Auto Scroll] Storage check - isEnabled:', s.isEnabled);
    if (s.isEnabled) {
      armObserver();
    } else {
      console.log('[X Auto Scroll] Extension disabled, not arming observer');
    }
  });

  // React to toggle changes
  chrome.storage.onChanged.addListener((_, area) => {
    if (area !== 'sync') return;
    console.log('[X Auto Scroll] Storage changed');
    chrome.storage.sync.get({ isEnabled: true }, (s) => {
      console.log('[X Auto Scroll] New isEnabled state:', s.isEnabled);
      if (!s.isEnabled && observer) {
        console.log('[X Auto Scroll] Disabling observer');
        observer.disconnect();
        observer = null;
      } else if (s.isEnabled) {
        console.log('[X Auto Scroll] Enabling observer');
        armObserver();
      }
    });
  });
})();