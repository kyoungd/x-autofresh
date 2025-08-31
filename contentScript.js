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

  // Configuration flags
  const ENABLE_TIME_RESTRICTIONS = false; // Set to false for testing
  const DEBUG_PRINT = false; // Set to true for verbose logging

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
    
    // 11:30 PM - 1:30 AM PST (11:30 PM-1:30 AM)
    const afternoonSession = (hours === 23 && minutes >= 30) || hours === 0 || (hours === 1 && minutes <= 30);
    
    const isActive = morningSession || afternoonSession;
    
    // Log time info occasionally
    if (Math.random() < 0.1) { // 10% chance to log
      console.log(`[X Auto Scroll] Pacific Time: ${hours}:${minutes.toString().padStart(2, '0')} - ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    }
    
    return isActive;
  };

  const getNextActiveTime = () => {
    return isWithinActiveHours() ? "Active Now" : "Not Active";
  };

  // Natural mouse movement simulation with bursts and pauses
  const simulateMouseMovement = (totalDuration = 12500) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let elapsed = 0;
      
      const doBurst = () => {
        if (elapsed >= totalDuration) {
          console.log(`[X Auto Scroll] Mouse movement simulation completed`);
          resolve();
          return;
        }
        
        // Random burst of 3-8 quick movements
        const burstSize = Math.floor(Math.random() * 6) + 3;
        let burstCount = 0;
        
        const burstInterval = setInterval(() => {
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
          
          burstCount++;
          if (burstCount >= burstSize) {
            clearInterval(burstInterval);
            
            // Pause between bursts (200-800ms)
            const pauseDuration = Math.random() * 600 + 200;
            elapsed += (burstSize * 50) + pauseDuration; // Approximate time
            
            setTimeout(doBurst, pauseDuration);
          }
        }, 30 + Math.random() * 40); // 30-70ms between moves in burst
      };
      
      doBurst();
    });
  };

  // Mouse wheel scrolling simulation with realistic chunks and pauses
  const mouseWheelScroll = (targetY, isScrollingUp = false) => {
    return new Promise((resolve) => {
      const startY = window.pageYOffset;
      const totalDistance = Math.abs(targetY - startY);
      let currentY = startY;
      
      const doScrollChunk = () => {
        const remainingDistance = isScrollingUp ? 
          Math.abs(currentY - targetY) : 
          Math.abs(targetY - currentY);
        
        if (remainingDistance <= 10) {
          // Final adjustment to exact target
          if (!isScrollingUp || targetY >= 0) {
            window.scrollTo(0, targetY);
          } else {
            // For upward scrolling beyond 0, let it try to go negative (browser will clamp to 0)
            window.scrollTo(0, targetY);
            // Then add a small bounce back
            setTimeout(() => {
              window.scrollTo(0, Math.abs(targetY * 0.1)); // Small bounce
              setTimeout(() => window.scrollTo(0, 0), 100); // Settle at 0
            }, 50);
          }
          resolve();
          return;
        }
        
        // Random chunk size around 200px (150-250px)
        const baseChunkSize = Math.random() * 100 + 150; // 150-250px
        const chunkSize = Math.min(baseChunkSize, remainingDistance);
        
        // Direction
        const scrollDirection = isScrollingUp ? -1 : 1;
        const newY = currentY + (chunkSize * scrollDirection);
        
        // Create and dispatch wheel event
        const wheelEvent = new WheelEvent('wheel', {
          view: window,
          bubbles: true,
          cancelable: true,
          deltaY: scrollDirection * 120, // Positive for down, negative for up
          deltaMode: WheelEvent.DOM_DELTA_PIXEL
        });
        
        document.dispatchEvent(wheelEvent);
        
        // Actually scroll
        if (!isScrollingUp || newY >= 0) {
          window.scrollTo(0, Math.max(0, newY));
          currentY = Math.max(0, newY);
        } else {
          // Allow negative attempt for bounce effect
          window.scrollTo(0, newY);
          currentY = newY;
        }
        
        console.log(`[X Auto Scroll] Scrolled ${chunkSize.toFixed(0)}px ${isScrollingUp ? 'up' : 'down'} (now at ${currentY}px)`);
        
        // Random pause between chunks (300-1200ms)
        const pauseDuration = Math.random() * 900 + 300;
        setTimeout(doScrollChunk, pauseDuration);
      };
      
      doScrollChunk();
    });
  };

  // Keep-alive micro scroll (600-2400px down, wait, then back to top every 3-7 minutes)
  const keepAliveScroll = async () => {
    const currentY = window.pageYOffset;
    
    // Random mouse movement duration between 10-15 seconds
    const mouseDuration = Math.random() * 5000 + 10000; // 10-15 seconds in ms
    console.log(`[X Auto Scroll] Starting ${Math.round(mouseDuration / 1000)}s of mouse movement before scrolling`);
    
    // Simulate mouse movement for 10-15 seconds
    await simulateMouseMovement(mouseDuration);
    
    // Random scroll distance between 600-2400px
    const scrollDistance = Math.floor(Math.random() * 1801) + 600; // 600-2400px
    const targetY = currentY + scrollDistance;
    
    console.log(`[X Auto Scroll] Keep-alive micro scroll: scrolling down ${scrollDistance}px`);
    
    // Scroll down with mouse wheel simulation
    await mouseWheelScroll(targetY, false);
    
    sendStatusMessage('KEEP_ALIVE_SCROLL', { 
      direction: 'down',
      distance: scrollDistance,
      position: window.pageYOffset
    });
    
    // Wait random time between 1-15 seconds
    const waitTime = Math.random() * 14000 + 1000; // 1-15 seconds in ms
    console.log(`[X Auto Scroll] Waiting ${Math.round(waitTime / 1000)}s before scrolling back up`);
    
    setTimeout(async () => {
      console.log(`[X Auto Scroll] Keep-alive micro scroll: scrolling back to top (with overshoot)`);
      
      // Scroll back to top with overshoot (go beyond 0)
      const overshoot = Math.random() * 200 + 100; // 100-300px overshoot
      await mouseWheelScroll(-overshoot, true);
      
      sendStatusMessage('KEEP_ALIVE_SCROLL', { 
        direction: 'up',
        distance: 0,
        position: window.pageYOffset,
        overshoot: overshoot
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

  // Track user interaction and audio context state
  let hasAudioPermission = false;
  let audioContext = null;
  let pendingAlert = false;

  // Request audio permission immediately on load
  const requestAudioPermission = () => {
    console.log('[X Auto Scroll] 🔊 Requesting audio permission for alert system...');
    
    // Create AudioContext
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[X Auto Scroll] Audio context created, state:', audioContext.state);
    } catch (e) {
      console.log('[X Auto Scroll] Audio context creation failed:', e);
      return;
    }
    
    // Show permission request message
    const permissionDiv = document.createElement('div');
    permissionDiv.id = 'x-autoscroll-audio-permission';
    permissionDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 10000; background: #1da1f2; color: white; padding: 20px;
      border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
      font-size: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 400px; line-height: 1.4;
    `;
    
    permissionDiv.innerHTML = `
      <div style="margin-bottom: 15px; font-weight: bold;">🔊 X Auto Scroll Alert System</div>
      <div style="margin-bottom: 20px;">This extension needs audio permission to play alert sounds when Pokemon Center queues are detected.</div>
      <button id="enable-audio-btn" style="
        background: white; color: #1da1f2; border: none; padding: 10px 20px;
        border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;
        margin-right: 10px;
      ">Enable Audio Alerts</button>
      <button id="skip-audio-btn" style="
        background: transparent; color: white; border: 1px solid white; padding: 10px 20px;
        border-radius: 6px; cursor: pointer; font-size: 14px;
      ">Skip (No Audio)</button>
    `;
    
    document.body.appendChild(permissionDiv);
    
    // Handle enable button
    document.getElementById('enable-audio-btn').onclick = async () => {
      try {
        console.log('[X Auto Scroll] User clicked "Enable Audio" - testing permission...');
        
        // Resume audio context
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        // Test with a short beep
        const testAudio = new Audio(chrome.runtime.getURL('alert.mp3'));
        testAudio.volume = 0.3;
        await testAudio.play();
        
        // Success!
        hasAudioPermission = true;
        chrome.storage.sync.set({ audioPermission: true });
        
        console.log('[X Auto Scroll] ✅ Audio permission granted successfully!');
        
        // Update UI
        permissionDiv.innerHTML = `
          <div style="color: #4CAF50; font-weight: bold; font-size: 18px;">✅ Audio Enabled!</div>
          <div style="margin-top: 10px;">Alert sounds will now play when queues are detected.</div>
        `;
        
        setTimeout(() => {
          permissionDiv.remove();
        }, 2000);
        
        sendStatusMessage('AUDIO_PERMISSION_GRANTED', { success: true });
        
      } catch (e) {
        console.log('[X Auto Scroll] Audio permission failed:', e);
        permissionDiv.innerHTML = `
          <div style="color: #ff6b6b; font-weight: bold;">❌ Audio Permission Failed</div>
          <div style="margin-top: 10px; font-size: 14px;">Please check browser settings and reload the page to try again.</div>
        `;
        
        setTimeout(() => {
          permissionDiv.remove();
        }, 3000);
      }
    };
    
    // Handle skip button  
    document.getElementById('skip-audio-btn').onclick = () => {
      console.log('[X Auto Scroll] User skipped audio permission');
      permissionDiv.remove();
      sendStatusMessage('AUDIO_PERMISSION_SKIPPED', { skipped: true });
    };
  };

  // Setup detection for any user interaction to unlock audio
  const setupUserInteractionDetection = () => {
    console.log('[X Auto Scroll] Setting up user interaction detection for audio unlock...');
    
    const unlockAudio = async (event) => {
      if (hasAudioPermission) return; // Already unlocked
      
      console.log('[X Auto Scroll] User interaction detected:', event.type, 'unlocking audio...');
      
      try {
        // Method 1: Resume audio context
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('[X Auto Scroll] Audio context resumed to state:', audioContext.state);
        } else if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('[X Auto Scroll] New audio context created, state:', audioContext.state);
        }
        
        // Method 2: Test with low volume beep first (less intrusive)
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.01, audioContext.currentTime); // Very low volume
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1); // Short beep
          
          console.log('[X Auto Scroll] ✅ Audio unlocked successfully with Web Audio!');
          hasAudioPermission = true;
          chrome.storage.sync.set({ audioPermission: true });
          
          // Remove event listeners - we're done
          ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(eventType => {
            document.removeEventListener(eventType, unlockAudio);
          });
          
          // Play any pending alert
          if (pendingAlert) {
            console.log('[X Auto Scroll] Playing pending alert...');
            pendingAlert = false;
            setTimeout(playAlert, 200);
          }
          
        } catch (webAudioError) {
          console.log('[X Auto Scroll] Web Audio test failed:', webAudioError);
          
          // Fallback: Test with HTML5 Audio
          const testAudio = new Audio(chrome.runtime.getURL('alert.mp3'));
          testAudio.volume = 0.1;
          await testAudio.play();
          
          console.log('[X Auto Scroll] ✅ Audio unlocked successfully with HTML5 Audio!');
          hasAudioPermission = true;
          chrome.storage.sync.set({ audioPermission: true });
          
          // Remove event listeners - we're done
          ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(eventType => {
            document.removeEventListener(eventType, unlockAudio);
          });
          
          // Play any pending alert
          if (pendingAlert) {
            console.log('[X Auto Scroll] Playing pending alert...');
            pendingAlert = false;
            setTimeout(playAlert, 200);
          }
        }
        
      } catch (e) {
        console.log('[X Auto Scroll] Audio unlock failed:', e);
      }
    };
    
    // Listen for any user interaction
    ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(eventType => {
      document.addEventListener(eventType, unlockAudio, { once: true, passive: true });
    });
  };

  // Check stored audio permission on load
  const checkAudioPermission = async () => {
    try {
      const result = await chrome.storage.sync.get({ audioPermission: false });
      hasAudioPermission = result.audioPermission;
      console.log('[X Auto Scroll] Stored audio permission status:', hasAudioPermission);
      
      if (hasAudioPermission) {
        // Re-initialize audio context for this session
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          console.log('[X Auto Scroll] Audio context re-initialized from stored permission');
        } catch (e) {
          console.log('[X Auto Scroll] Audio context re-initialization failed:', e);
          hasAudioPermission = false;
          requestAudioPermission();
        }
      } else {
        // Request audio permission with user-friendly prompt
        requestAudioPermission();
      }
    } catch (e) {
      console.log('[X Auto Scroll] Failed to check audio permission:', e);
      requestAudioPermission();
    }
  };

  // Initialize audio context when permission is granted
  const initAudioContext = () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      console.log('[X Auto Scroll] Audio context initialized successfully');
      
      // If there was a pending alert, play it now
      if (pendingAlert) {
        pendingAlert = false;
        setTimeout(playAlert, 100);
      }
    } catch (e) {
      console.log('[X Auto Scroll] Audio context creation failed:', e);
    }
  };

  // Listen for audio permission messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUDIO_PERMISSION_GRANTED') {
      console.log('[X Auto Scroll] Audio permission granted via popup');
      hasAudioPermission = true;
      initAudioContext();
      
      // If there was a pending alert, play it now
      if (pendingAlert) {
        console.log('[X Auto Scroll] Playing pending alert now that permission is granted');
        pendingAlert = false;
        setTimeout(playAlert, 500);
      }
      
      sendResponse({ success: true });
    }
  });

  // Check permission on load
  checkAudioPermission();

  // play alert sound from file
  const playAlert = () => {
    console.log('[X Auto Scroll] Attempting to play alert...');
    
    // Try to play audio regardless of permission state (aggressive approach)
    try {
      const audio = new Audio(chrome.runtime.getURL('alert.mp3'));
      audio.volume = 0.7;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[X Auto Scroll] ✅ Alert played successfully');
            hasAudioPermission = true; // Mark as working
            chrome.storage.sync.set({ audioPermission: true });
            sendStatusMessage('ALERT_PLAYED', { success: true });
          })
          .catch(e => {
            console.log('[X Auto Scroll] Alert audio failed, checking permission and trying fallback:', e);
            
            if (!hasAudioPermission) {
              console.log('[X Auto Scroll] Queuing alert - no audio permission yet');
              pendingAlert = true;
              sendStatusMessage('ALERT_QUEUED', { 
                reason: 'Browser audio policy blocking - waiting for user interaction',
                instructions: 'Audio will play automatically after any page interaction (click, scroll, keypress)'
              });
            } else {
              // Try fallback beep
              playBeep();
              sendStatusMessage('ALERT_PLAYED', { 
                success: false, 
                error: e.message,
                fallback: 'beep'
              });
            }
          });
      }
    } catch (e) {
      console.log('[X Auto Scroll] Alert audio creation failed:', e);
      
      if (!hasAudioPermission) {
        console.log('[X Auto Scroll] Queuing alert - no audio permission yet');
        pendingAlert = true;
        sendStatusMessage('ALERT_QUEUED', { 
          reason: 'Audio context not ready',
          instructions: 'Audio will play automatically after any page interaction'
        });
      } else {
        playBeep(); // Fallback to beep
        sendStatusMessage('ALERT_PLAYED', { 
          success: false, 
          error: e.message,
          fallback: 'beep'
        });
      }
    }
  };

  // play beep sound - try multiple methods aggressively
  const playBeep = () => {
    console.log('[X Auto Scroll] 🔊 Playing beep (aggressive mode)');

    // Method 1: Use initialized Web Audio API context (try regardless of permission state)
    try {
      const context = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended
      if (context.state === 'suspended') {
        context.resume().then(() => {
          createBeep(context);
        }).catch(e => console.log('[X Auto Scroll] Audio context resume failed:', e));
      } else {
        createBeep(context);
      }
      
      function createBeep(ctx) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.log('[X Auto Scroll] Web Audio API failed:', e);
    }

    // Method 2: HTML5 Audio with data URI (try regardless of permission state)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ2PLCeSgGKYDI8N2QQAoUXrTp66hVFApGn+H1unMfCkCZ');
      audio.volume = 0.1;
      audio.play().catch(e => console.log('[X Auto Scroll] HTML5 Audio failed:', e));
    } catch (e) {
      console.log('[X Auto Scroll] HTML5 Audio creation failed:', e);
    }

    // If we don't have permission yet, queue this beep for when we get it
    if (!hasAudioPermission) {
      console.log('[X Auto Scroll] ⏳ No audio permission yet, but attempting beep anyway');
      // Store that we attempted a beep for potential retry
      chrome.storage.sync.set({ pendingBeep: true });
    }
  };

  // click on "Show X posts" button
  const clickShowPosts = () => {
    if (DEBUG_PRINT) {
      console.log('[X Auto Scroll] Searching for "Show X posts" button...');
    }
    
    // Method 1: Look for spans with "Show X post" text
    const allSpans = document.querySelectorAll('span');
    if (DEBUG_PRINT) {
      console.log(`[X Auto Scroll] Found ${allSpans.length} span elements to check`);
    }
    
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
    if (DEBUG_PRINT) {
      console.log(`[X Auto Scroll] Found ${cellDivs.length} cellInnerDiv elements to check`);
    }
    
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
    
    if (DEBUG_PRINT) {
      console.log('[X Auto Scroll] ⚪ No "Show X posts" message found');
    }
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

    // Check for "pokemon center queue" or "Costco queue" in the first 4 panels only
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
      if (panelText.toLowerCase().includes('queue live at costco') || panelText.toLowerCase().includes('is up at costco')) {
        console.log(`[X Auto Scroll] Found "queue live at costco" in panel at translateY(${panel.translateY}px) - playing alert`);
        sendStatusMessage('COSTCO_QUEUE_DETECTED', { 
          timestamp: new Date().toISOString(),
          panelPosition: panel.translateY 
        });
        playAlert();
        return true;
      }
      if (panelText.toLowerCase().includes('is up at target')) {
        console.log(`[X Auto Scroll] Found "queue live at costco" in panel at translateY(${panel.translateY}px) - playing alert`);
        sendStatusMessage('COSTCO_QUEUE_DETECTED', { 
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
        if (DEBUG_PRINT) {
          console.log('[X Auto Scroll] No "Show X posts" button found in immediate test');
        }
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