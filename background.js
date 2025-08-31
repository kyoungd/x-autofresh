// Service Worker for X Auto Scroll Extension
console.log('[X Auto Scroll Background] Service worker starting...');

// Configuration flags
const DEBUG_PRINT = false; // Set to true for verbose logging

// Track active tabs and their status
const tabStatus = new Map();

// Log all messages to console with timestamps
const log = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [X Auto Scroll Background] ${message}`, data || '');
};

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  log('Extension installed/updated', { reason: details.reason });
  
  // Set default settings
  chrome.storage.sync.set({ isEnabled: true }, () => {
    log('Default settings initialized');
  });

  // Check if audio permission is needed and auto-open popup
  checkAndRequestAudioPermission();
});

// Handle startup
chrome.runtime.onStartup.addListener(() => {
  log('Browser started, service worker active');
  
  // Check audio permission on startup too
  setTimeout(checkAndRequestAudioPermission, 2000);
});

// Check audio permission and auto-open popup if needed
const checkAndRequestAudioPermission = async () => {
  try {
    const { audioPermission } = await chrome.storage.sync.get({ audioPermission: false });
    
    if (!audioPermission) {
      log('🔊 No audio permission detected - checking for Twitter/X tabs...');
      
      // Check if user has Twitter/X tabs open
      chrome.tabs.query({}, (tabs) => {
        const twitterTabs = tabs.filter(tab => 
          tab.url?.includes('twitter.com') || tab.url?.includes('x.com')
        );
        
        if (twitterTabs.length > 0) {
          log(`📍 Found ${twitterTabs.length} Twitter/X tab(s) - opening popup for audio permission`);
          
          // Focus the first Twitter/X tab and open popup
          chrome.tabs.update(twitterTabs[0].id, { active: true }, () => {
            // Small delay to ensure tab is focused
            setTimeout(() => {
              chrome.action.openPopup().then(() => {
                log('✅ Popup opened automatically for audio permission');
              }).catch(e => {
                log('❌ Failed to auto-open popup (user interaction required):', e.message);
                // Set a badge to draw attention
                chrome.action.setBadgeText({ text: '!' });
                chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
                chrome.action.setTitle({ title: 'Click to enable Pokemon queue audio alerts' });
              });
            }, 500);
          });
        } else {
          log('⚪ No Twitter/X tabs found - will check audio permission when user visits Twitter/X');
        }
      });
    } else {
      log('✅ Audio permission already granted');
      // Clear any badge
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'X Auto Scroll - Pokemon Queue Monitor' });
    }
  } catch (e) {
    log('Error checking audio permission:', e);
  }
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  const url = sender.tab?.url;
  
  log(`Message received from tab ${tabId}`, { 
    type: message.type, 
    url: url?.substring(0, 50) + '...',
    data: message.data 
  });

  switch (message.type) {
    case 'STATUS_UPDATE':
      tabStatus.set(tabId, {
        lastUpdate: Date.now(),
        status: message.data.status,
        url: url,
        details: message.data.details
      });
      
      if (DEBUG_PRINT) {
        log(`Tab ${tabId} status: ${message.data.status}`, message.data.details);
      }
      break;

    case 'AUDIO_PERMISSION_GRANTED_CLEAR_BADGE':
      log('🔊 Audio permission granted - clearing notification badge');
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'X Auto Scroll - Pokemon Queue Monitor' });
      break;

    case 'SHOW_POSTS_CLICKED':
      if (message.data.success) {
        log(`✅ FOUND & CLICKED: "${message.data.text}" on tab ${tabId}`, { 
          clickedElement: message.data.clickedElement,
          url: url?.substring(0, 50) + '...'
        });
      } else {
        log(`❌ FOUND BUT FAILED TO CLICK: "${message.data.text}" on tab ${tabId}`, { 
          error: message.data.error,
          url: url?.substring(0, 50) + '...'
        });
      }
      break;

    case 'POKEMON_QUEUE_DETECTED':
      log(`🚨 POKEMON CENTER QUEUE detected on tab ${tabId}!`, { 
        url: url?.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      break;

    case 'COSTCO_QUEUE_DETECTED':
      log(`🚨 COSTCO QUEUE detected on tab ${tabId}!`, { 
        url: url?.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      break;

    case 'ALERT_PLAYED':
      log(`🔊 Alert played on tab ${tabId}`, { 
        success: message.data.success,
        error: message.data.error
      });
      break;

    case 'ALERT_QUEUED':
      log(`⏳ Alert queued on tab ${tabId} - ${message.data.reason}`, { 
        reason: message.data.reason,
        instructions: message.data.instructions
      });
      break;

    case 'EXTENSION_ENABLED':
      if (message.data && message.data.timeActive !== undefined) {
        const timeStatus = message.data.timeActive ? '✅ ACTIVE HOURS' : '❌ INACTIVE HOURS';
        const nextTime = message.data.timeActive ? '' : ` (Next: ${message.data.nextActiveTime})`;
        log(`Extension enabled on tab ${tabId} - ${timeStatus}${nextTime}`);
      } else {
        log(`Extension enabled on tab ${tabId}`);
      }
      break;

    case 'EXTENSION_DISABLED':
      log(`Extension disabled on tab ${tabId}`);
      break;

    case 'INTERVAL_CHECK':
      if (message.data.inactiveHours) {
        log(`⏰ INACTIVE HOURS - Next active: ${message.data.nextActiveTime}`, {
          timestamp: message.data.timestamp
        });
      } else {
        const pokemonStatus = message.data.foundPokemon ? '🚨 Pokemon found!' : '';
        const showPostsStatus = message.data.clickedShowPosts ? '✅ Clicked "Show posts"' : '⚪ No "Show posts" found';
        
        log(`🔍 10s Check on tab ${tabId}: ${showPostsStatus} ${pokemonStatus}`.trim(), {
          foundPokemon: message.data.foundPokemon,
          clickedShowPosts: message.data.clickedShowPosts,
          timestamp: message.data.timestamp
        });
      }
      break;

    case 'KEEP_ALIVE_SCROLL':
      log(`💓 Keep-alive scroll on tab ${tabId}: ${message.data.direction} 1px`, {
        position: message.data.position
      });
      break;

    default:
      log('Unknown message type', { type: message.type, data: message.data });
  }

  // Send acknowledgment
  sendResponse({ received: true, timestamp: Date.now() });
});

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (tab.url?.includes('twitter.com') || tab.url?.includes('x.com')) {
      log(`✅ FOUND Twitter/X tab: ${tabId}`, { url: tab.url?.substring(0, 50) + '...' });
      log(`Extension will activate on this tab automatically`);
      
      // Check if we need audio permission for this new Twitter/X tab
      checkAudioPermissionForNewTab(tabId);
    }
  }
});

// Check audio permission when user opens a new Twitter/X tab
const checkAudioPermissionForNewTab = async (tabId) => {
  try {
    const { audioPermission } = await chrome.storage.sync.get({ audioPermission: false });
    
    if (!audioPermission) {
      log(`🔊 New Twitter/X tab ${tabId} opened without audio permission - setting notification badge`);
      
      // Set attention-grabbing badge
      chrome.action.setBadgeText({ text: '🔊' });
      chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
      chrome.action.setTitle({ title: 'IMPORTANT: Click to enable Pokemon queue audio alerts!' });
      
      // Try to auto-open popup (may fail due to user interaction requirements)
      setTimeout(() => {
        chrome.action.openPopup().then(() => {
          log('✅ Popup auto-opened for new Twitter/X tab');
        }).catch(e => {
          log('⚠️ Cannot auto-open popup - user must click extension icon for audio permission');
        });
      }, 1000);
    }
  } catch (e) {
    log('Error checking audio permission for new tab:', e);
  }
};

// Monitor tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabStatus.has(tabId)) {
    log(`Tab ${tabId} closed, removing from status tracking`);
    tabStatus.delete(tabId);
  }
});

// Log storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    log('Extension settings changed', changes);
  }
});

// Scan for Twitter/X pages
const scanForTwitterPages = () => {
  chrome.tabs.query({}, (tabs) => {
    const twitterTabs = tabs.filter(tab => 
      tab.url?.includes('twitter.com') || tab.url?.includes('x.com')
    );
    
    if (twitterTabs.length > 0) {
      if (DEBUG_PRINT) {
        log(`📍 SCAN RESULT: Found ${twitterTabs.length} Twitter/X page(s):`);
        twitterTabs.forEach(tab => {
          log(`  Tab ${tab.id}: ${tab.url?.substring(0, 60)}...`);
        });
      }
    } else {
      if (DEBUG_PRINT) {
        log(`❌ SCAN RESULT: No Twitter/X pages found`);
        log(`💡 Open x.com or twitter.com to start monitoring`);
      }
    }
  });
};

// Keep service worker alive and log periodic status
setInterval(() => {
  const activeTabsCount = tabStatus.size;
  if (DEBUG_PRINT) {
    log(`Service worker heartbeat - tracking ${activeTabsCount} active tabs`);
  }
  
  // Scan for Twitter/X pages every heartbeat
  scanForTwitterPages();
  
  // Clean up old tab status (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [tabId, status] of tabStatus.entries()) {
    if (status.lastUpdate < fiveMinutesAgo) {
      log(`Cleaning up stale tab status: ${tabId}`);
      tabStatus.delete(tabId);
    }
  }
}, 30000); // Every 30 seconds

log('Service worker initialized and ready');

// Perform initial scan for Twitter/X pages
setTimeout(() => {
  log('🔍 Performing initial scan for Twitter/X pages...');
  scanForTwitterPages();
}, 1000);