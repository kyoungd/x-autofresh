document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('enableToggle');
  const statusEl = document.getElementById('status');
  const audioBtn = document.getElementById('audioPermissionBtn');
  const audioStatusEl = document.getElementById('audioStatus');
  const audioSection = document.getElementById('audioSection');

  const setVisual = (enabled) => {
    toggle.classList.toggle('active', enabled);
    toggle.setAttribute('aria-checked', enabled);
    statusEl.textContent = enabled ? 'Auto scroll is ON' : 'Auto scroll is OFF';
    statusEl.style.color = enabled ? '#28a745' : '#dc3545';
  };

  const setAudioButtonState = (hasPermission) => {
    if (hasPermission) {
      audioBtn.textContent = '✅ Audio Alerts Enabled';
      audioBtn.style.background = '#28a745';
      audioBtn.style.color = 'white';
      audioBtn.disabled = false; // Allow clicking to test again
      audioBtn.title = 'Click to test audio again';
      audioStatusEl.innerHTML = '🔊 <strong>Ready!</strong> Queue alerts will play sound automatically.';
      audioStatusEl.style.color = '#28a745';
      audioSection.classList.remove('needs-permission');
      
      // Update background badge 
      chrome.runtime.sendMessage({ type: 'AUDIO_PERMISSION_GRANTED_CLEAR_BADGE' });
    } else {
      audioBtn.textContent = '🔊 Click to Enable Audio Alerts';
      audioBtn.style.background = '#007bff';
      audioBtn.style.color = 'white';
      audioBtn.disabled = false;
      audioBtn.title = 'REQUIRED: Click to enable audio alerts for queue notifications';
      audioStatusEl.innerHTML = '⚠️ <strong>Audio permission required</strong> for Pokemon/Costco queue alerts';
      audioStatusEl.style.color = '#dc3545';
      audioStatusEl.style.fontWeight = 'bold';
      audioSection.classList.add('needs-permission');
    }
  };

  // Load states
  const { isEnabled, audioPermission } = await chrome.storage.sync.get({ 
    isEnabled: true, 
    audioPermission: false 
  });
  setVisual(isEnabled);
  setAudioButtonState(audioPermission);

  // Auto-trigger audio permission test if not yet granted
  if (!audioPermission) {
    console.log('[Popup] No audio permission - highlighting audio button');
    audioBtn.style.animation = 'pulse 2s infinite';
    audioBtn.style.boxShadow = '0 0 15px #007bff';
    
    // Show prominent message
    audioStatusEl.innerHTML = '� <strong>CLICK THE BLUE BUTTON ABOVE</strong><br>to enable Pokemon queue alerts!';
    audioStatusEl.style.color = '#007bff';
    audioStatusEl.style.fontSize = '12px';
    audioStatusEl.style.fontWeight = 'bold';
  }

  // Toggle handler
  toggle.addEventListener('click', async () => {
    const newState = !(toggle.getAttribute('aria-checked') === 'true');
    await chrome.storage.sync.set({ isEnabled: newState });
    setVisual(newState);
  });

  // Audio permission handler - this is the key function
  audioBtn.addEventListener('click', async () => {
    const originalText = audioBtn.textContent;
    audioBtn.textContent = '🔄 Testing Audio...';
    audioBtn.disabled = true;
    audioBtn.style.animation = 'none';
    audioBtn.style.boxShadow = 'none';
    
    try {
      // Method 1: Try to play the actual alert MP3
      const audio = new Audio(chrome.runtime.getURL('alert.mp3'));
      audio.volume = 0.3; // Lower volume for testing
      
      const playPromise = audio.play();
      
      await playPromise; // This will throw if autoplay is blocked
      
      // If we get here, audio works!
      console.log('[Popup] ✅ Audio permission test successful');
      
      // Stop the audio after a brief moment
      setTimeout(() => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          console.log('[Popup] Audio cleanup failed:', e);
        }
      }, 800);
      
      await chrome.storage.sync.set({ audioPermission: true });
      setAudioButtonState(true);
      
      // Send message to content scripts about permission granted
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'AUDIO_PERMISSION_GRANTED' 
          }).catch(() => {
            // Content script might not be loaded yet, that's ok
          });
        }
      });
      
      // Show success message
      audioStatusEl.innerHTML = '🎉 <strong>SUCCESS!</strong> Audio alerts are now enabled for queue monitoring.';
      audioStatusEl.style.color = '#28a745';
      
    } catch (error) {
      console.log('[Popup] Audio permission test failed:', error);
      
      // Try Web Audio API as fallback
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a brief test beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // If we get here, Web Audio works
        await chrome.storage.sync.set({ audioPermission: true });
        setAudioButtonState(true);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              type: 'AUDIO_PERMISSION_GRANTED' 
            }).catch(() => {});
          }
        });
        
        audioStatusEl.innerHTML = '✅ <strong>Audio enabled!</strong> Using beep alerts for queue notifications.';
        audioStatusEl.style.color = '#28a745';
        
      } catch (audioContextError) {
        console.log('[Popup] Both audio methods failed:', error, audioContextError);
        audioBtn.textContent = '❌ Audio Blocked - Try Again';
        audioBtn.style.background = '#dc3545';
        audioBtn.style.color = 'white';
        audioBtn.disabled = false;
        audioStatusEl.innerHTML = '❌ <strong>Browser blocked audio.</strong><br><br><strong>Try this:</strong><br>1. Play any video on this X/Twitter tab<br>2. Then click this button again<br><br><em>OR refresh the page and try immediately</em>';
        audioStatusEl.style.color = '#dc3545';
        audioStatusEl.style.fontSize = '10px';
      }
    }
  });
});