(() => {
  console.log('[X Auto Scroll] Content script loaded on:', window.location.href);
  console.log('[X Auto Scroll] Document ready state:', document.readyState);
  console.log('[X Auto Scroll] Page title:', document.title);
  
  // Send status messages to service worker
  const sendStatusMessage = (type, data = {}) => {
    console.log(`[X Auto Scroll] Sending message: ${type}`, data);
    chrome.runtime.sendMessage({
      type: type,
      data: data
    }).then(response => {
      console.log('[X Auto Scroll] Message sent successfully:', response);
    }).catch(e => {
      console.log('[X Auto Scroll] Failed to send message:', e);
    });
  };
  
  // Send initial status
  console.log('[X Auto Scroll] Sending initial status message...');
  sendStatusMessage('STATUS_UPDATE', { 
    status: '🚀 Content script ACTIVE on Twitter/X page', 
    details: { 
      url: window.location.href,
      title: document.title,
      ready: true,
      timestamp: new Date().toISOString()
    }
  });
  let observer = null;
  let lastHandled = 0;  // 10‑second debounce for scroll action
  let keepAliveInterval = null;

  // Random number generator helper
  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  // Configuration flag to enable/disable time restrictions (for testing)
  const ENABLE_TIME_RESTRICTIONS = true; // Set to false for testing

  // Time-based activation helper
  const isWithinActiveHours = () => {
    if (!ENABLE_TIME_RESTRICTIONS) {
      return true; // Always active when restrictions are disabled
    }
    const now = new Date();
    
    // Convert to Pacific Time (handles PST/PDT automatically)
    const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const hours = pacificTime.getHours();
    const minutes = pacificTime.getMinutes();
    
    // 8:00 AM - 12:00 PM PST (8-12 hours)
    const morningSession = hours >= 8 && hours < 12;
    
    // 1:00 PM - 3:30 PM PST (13:00-15:30)
    const afternoonSession = hours === 13 || hours === 14 || (hours === 15 && minutes <= 30);
    
    const isActive = morningSession || afternoonSession;
    
    // Log time info occasionally
    if (Math.random() < 0.1) { // 10% chance to log
      console.log(`[X Auto Scroll] Pacific Time: ${hours}:${minutes.toString().padStart(2, '0')} - ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    }
    
    return isActive;
  };

  const getNextActiveTime = () => {
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const hours = pacificTime.getHours();
    const minutes = pacificTime.getMinutes();
    
    // If before 8 AM, next active is 8 AM today
    if (hours < 8) {
      return "8:00 AM PT";
    }
    // If between 12 PM and 1 PM, next active is 1 PM today
    else if (hours === 12 || (hours === 13 && minutes === 0)) {
      return "1:00 PM PT";
    }
    // If after 3:30 PM, next active is 8 AM tomorrow
    else if (hours > 15 || (hours === 15 && minutes > 30)) {
      return "8:00 AM PT tomorrow";
    }
    // Otherwise we're currently active
    else {
      return "Active now";
    }
  };

  // Natural mouse movement simulation
  const simulateMouseMovement = (duration = 12500) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const totalMoves = Math.floor(duration / 100); // Move every 100ms
      let moveCount = 0;
      
      const moveInterval = setInterval(() => {
        // Random position within viewport
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        
        // Create and dispatch synthetic mouse events
        const mouseMoveEvent = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });
        
        document.dispatchEvent(mouseMoveEvent);
        
        moveCount++;
        if (moveCount >= totalMoves || Date.now() - startTime >= duration) {
          clearInterval(moveInterval);
          console.log(`[X Auto Scroll] Mouse movement simulation completed (${moveCount} moves)`);
          resolve();
        }
      }, Math.random() * 50 + 75); // 75-125ms between moves
    });
  };

  // Natural scrolling animation helper
  const naturalScroll = (targetY, duration = 2000) => {
    return new Promise((resolve) => {
      const startY = window.pageYOffset;
      const distance = targetY - startY;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Add slight randomness to make movement more natural
        const randomOffset = (Math.random() - 0.5) * 2; // ±1px random jitter
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        const currentY = startY + (distance * easeProgress) + randomOffset;
        
        window.scrollTo(0, Math.max(0, currentY));
        
        if (progress < 1) {
          // Add slight delay between frames (16-33ms) for more natural movement
          setTimeout(animate, Math.random() * 17 + 16);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  };

  // Keep-alive micro scroll (300-1200px down, wait, then back to top every 3-7 minutes)
  const keepAliveScroll = async () => {
    const currentY = window.pageYOffset;
    
    // Random mouse movement duration between 10-15 seconds
    const mouseDuration = Math.random() * 5000 + 10000; // 10-15 seconds in ms
    console.log(`[X Auto Scroll] Starting ${Math.round(mouseDuration / 1000)}s of mouse movement before scrolling`);
    
    // Simulate mouse movement for 10-15 seconds
    await simulateMouseMovement(mouseDuration);
    
    // Random scroll distance between 300-1200px
    const scrollDistance = Math.floor(Math.random() * 901) + 300; // 300-1200px
    const targetY = currentY + scrollDistance;
    
    console.log(`[X Auto Scroll] Keep-alive micro scroll: scrolling down ${scrollDistance}px`);
    
    // Scroll down naturally
    await naturalScroll(targetY, Math.random() * 1000 + 1500); // 1.5-2.5 seconds
    
    sendStatusMessage('KEEP_ALIVE_SCROLL', { 
      direction: 'down',
      distance: scrollDistance,
      position: window.pageYOffset
    });
    
    // Wait random time between 1-15 seconds
    const waitTime = Math.random() * 14000 + 1000; // 1-15 seconds in ms
    console.log(`[X Auto Scroll] Waiting ${Math.round(waitTime / 1000)}s before scrolling back up`);
    
    setTimeout(async () => {
      console.log(`[X Auto Scroll] Keep-alive micro scroll: scrolling back to top`);
      
      // Scroll back to top naturally
      await naturalScroll(0, Math.random() * 1500 + 2000); // 2-3.5 seconds
      
      sendStatusMessage('KEEP_ALIVE_SCROLL', { 
        direction: 'up',
        distance: 0,
        position: window.pageYOffset
      });
    }, waitTime);
  };

  // Start random keep-alive scrolling (only during active hours)
  const startKeepAlive = () => {
    const scheduleNextKeepAlive = () => {
      const nextInterval = randomBetween(3 * 60 * 1000, 7 * 60 * 1000); // 3-7 minutes in ms
      console.log(`[X Auto Scroll] Next keep-alive scroll in ${Math.round(nextInterval / 60000)} minutes`);
      
      keepAliveInterval = setTimeout(() => {
        if (!document.hidden && isWithinActiveHours()) {
          keepAliveScroll();
        } else if (!isWithinActiveHours()) {
          console.log(`[X Auto Scroll] Skipping keep-alive: outside active hours`);
        }
        scheduleNextKeepAlive(); // Schedule the next one
      }, nextInterval);
    };
    
    scheduleNextKeepAlive();
  };

  const stopKeepAlive = () => {
    if (keepAliveInterval) {
      clearTimeout(keepAliveInterval);
      keepAliveInterval = null;
      console.log('[X Auto Scroll] Keep-alive scrolling stopped');
    }
  };

  // play alert sound from file
  const playAlert = () => {
    try {
      const audio = new Audio(chrome.runtime.getURL('alert.mp3'));
      audio.volume = 0.7;
      audio.play()
        .then(() => {
          sendStatusMessage('ALERT_PLAYED', { success: true });
        })
        .catch(e => {
          console.log('[X Auto Scroll] Alert audio failed:', e);
          sendStatusMessage('ALERT_PLAYED', { success: false, error: e.message });
        });
    } catch (e) {
      console.log('[X Auto Scroll] Alert audio creation failed:', e);
      sendStatusMessage('ALERT_PLAYED', { success: false, error: e.message });
    }
  };

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

  // click on "Show X posts" button
  const clickShowPosts = () => {
    console.log('[X Auto Scroll] Searching for "Show X posts" button...');
    
    // Method 1: Look for spans with "Show X post" text
    const allSpans = document.querySelectorAll('span');
    console.log(`[X Auto Scroll] Found ${allSpans.length} span elements to check`);
    
    let foundMessage = null;
    
    for (const span of allSpans) {
      const text = span.textContent;
      if (text && /^Show \d+ posts?$/.test(text.trim())) {
        foundMessage = text.trim();
        console.log('[X Auto Scroll] ✅ FOUND "Show X posts" message:', foundMessage);
        
        try {
          // Look for the button parent (should be role="button")
          let clickTarget = span;
          let parent = span.parentElement;
          
          while (parent && parent !== document.body) {
            if (parent.getAttribute('role') === 'button' || parent.tagName === 'BUTTON') {
              clickTarget = parent;
              console.log('[X Auto Scroll] Found clickable parent:', parent.tagName, parent.getAttribute('role'));
              break;
            }
            parent = parent.parentElement;
          }
          
          console.log('[X Auto Scroll] Attempting to click:', clickTarget.tagName);
          clickTarget.click();
          console.log('[X Auto Scroll] ✅ Successfully clicked "Show X posts" button');
          
          sendStatusMessage('SHOW_POSTS_CLICKED', { 
            text: foundMessage,
            success: true,
            clickedElement: clickTarget.tagName,
            hasRole: clickTarget.getAttribute('role')
          });
          
          return true;
        } catch (error) {
          console.log('[X Auto Scroll] ❌ Failed to click "Show X posts" button:', error);
          
          sendStatusMessage('SHOW_POSTS_CLICKED', { 
            text: foundMessage,
            success: false,
            error: error.message
          });
          
          return false;
        }
      }
    }
    
    // Method 2: Look specifically for buttons with data-testid="cellInnerDiv" parent
    const cellDivs = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    console.log(`[X Auto Scroll] Found ${cellDivs.length} cellInnerDiv elements to check`);
    
    for (const cellDiv of cellDivs) {
      const spans = cellDiv.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent;
        if (text && /^Show \d+ posts?$/.test(text.trim())) {
          foundMessage = text.trim();
          console.log('[X Auto Scroll] ✅ FOUND "Show X posts" in cellInnerDiv:', foundMessage);
          
          const button = cellDiv.querySelector('button[role="button"]');
          if (button) {
            try {
              button.click();
              console.log('[X Auto Scroll] ✅ Successfully clicked cellInnerDiv button');
              
              sendStatusMessage('SHOW_POSTS_CLICKED', { 
                text: foundMessage,
                success: true,
                clickedElement: 'BUTTON',
                method: 'cellInnerDiv'
              });
              
              return true;
            } catch (error) {
              console.log('[X Auto Scroll] ❌ Failed to click cellInnerDiv button:', error);
            }
          }
        }
      }
    }
    
    console.log('[X Auto Scroll] ⚪ No "Show X posts" message found');
    return false;
  };

  // check for "pokemon center queue" text
  const checkForPokemonQueue = () => {
    // Find all div elements with translateY transform (these are the info panels)
    const panels = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'))
      .filter(div => {
        const style = div.getAttribute('style');
        return style && style.includes('transform: translateY(');
      })
      .map(div => {
        const style = div.getAttribute('style');
        const match = style.match(/translateY\((\d+(?:\.\d+)?)px\)/);
        return {
          element: div,
          translateY: match ? parseFloat(match[1]) : Infinity
        };
      })
      .sort((a, b) => a.translateY - b.translateY)
      .slice(0, 3); // Only check first 3 panels (lowest translateY values)

    // Check for "pokemon center queue" in the first 3 panels only
    for (const panel of panels) {
      const panelText = panel.element.textContent || panel.element.innerText || '';
      if (panelText.toLowerCase().includes('pokemon center queue')) {
        console.log(`[X Auto Scroll] Found "pokemon center queue" in panel at translateY(${panel.translateY}px) - playing alert`);
        sendStatusMessage('POKEMON_QUEUE_DETECTED', { 
          timestamp: new Date().toISOString(),
          panelPosition: panel.translateY 
        });
        playAlert();
        return true;
      }
    }
    
    return false;
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

  // Time-aware interval check
  let intervalCheck;
  const startIntervalCheck = () => {
    if (intervalCheck) clearInterval(intervalCheck);
    
    intervalCheck = setInterval(() => {
      if (document.hidden) {
        console.log('[X Auto Scroll] Document hidden, skipping interval check');
        return;
      }
      
      // Check if we're within active hours
      if (!isWithinActiveHours()) {
        const nextActive = getNextActiveTime();
        console.log(`[X Auto Scroll] Outside active hours. Next active: ${nextActive}`);
        
        sendStatusMessage('INTERVAL_CHECK', { 
          foundPokemon: false,
          clickedShowPosts: false,
          timestamp: new Date().toISOString(),
          checkedForShowPosts: false,
          inactiveHours: true,
          nextActiveTime: nextActive
        });
        return;
      }
      
      // Check for pokemon center queue
      const foundPokemon = checkForPokemonQueue();
      
      // Check for and click "Show X posts"
      const clicked = clickShowPosts();
      
      // Send interval check status
      sendStatusMessage('INTERVAL_CHECK', { 
        foundPokemon: foundPokemon,
        clickedShowPosts: clicked,
        timestamp: new Date().toISOString(),
        checkedForShowPosts: true,
        inactiveHours: false
      });
      
      if (clicked) {
        console.log('[X Auto Scroll] ✅ Clicked "Show X posts" during interval check');
      }
    }, 10000); // 10 seconds
  };

  const stopIntervalCheck = () => {
    if (intervalCheck) {
      clearInterval(intervalCheck);
      intervalCheck = null;
    }
  };

  // Test button detection immediately
  const testButtonDetection = () => {
    console.log('[X Auto Scroll] Testing button detection...');
    setTimeout(() => {
      console.log('[X Auto Scroll] Running immediate test for "Show X posts" button');
      const found = clickShowPosts();
      if (!found) {
        console.log('[X Auto Scroll] No "Show X posts" button found in immediate test');
      }
    }, 2000); // Wait 2 seconds for page to load
  };

  // Initial arm with time check
  chrome.storage.sync.get({ isEnabled: true }, (s) => {
    console.log('[X Auto Scroll] Storage check - isEnabled:', s.isEnabled);
    
    // Show current time status
    const isActive = isWithinActiveHours();
    const nextActive = getNextActiveTime();
    console.log(`[X Auto Scroll] Time status: ${isActive ? 'ACTIVE' : 'INACTIVE'}${!isActive ? ` (Next: ${nextActive})` : ''}`);
    
    if (s.isEnabled) {
      armObserver();
      startIntervalCheck();
      startKeepAlive(); // Start keep-alive scrolling
      if (isActive) {
        testButtonDetection(); // Test immediately only if active
      }
      sendStatusMessage('EXTENSION_ENABLED', { 
        timeActive: isActive, 
        nextActiveTime: nextActive 
      });
    } else {
      console.log('[X Auto Scroll] Extension disabled, not arming observer');
      sendStatusMessage('EXTENSION_DISABLED');
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
        stopIntervalCheck();
        stopKeepAlive();
        sendStatusMessage('EXTENSION_DISABLED');
      } else if (s.isEnabled) {
        console.log('[X Auto Scroll] Enabling observer');
        armObserver();
        startIntervalCheck();
        startKeepAlive();
        sendStatusMessage('EXTENSION_ENABLED');
      }
    });
  });
})();