// Service Worker for X Auto Scroll Extension
console.log('[X Auto Scroll Background] Service worker starting...');

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
});

// Handle startup
chrome.runtime.onStartup.addListener(() => {
  log('Browser started, service worker active');
});

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
      
      log(`Tab ${tabId} status: ${message.data.status}`, message.data.details);
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

    case 'ALERT_PLAYED':
      log(`🔊 Alert played on tab ${tabId}`, { 
        success: message.data.success,
        error: message.data.error
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
    }
  }
});

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
      log(`📍 SCAN RESULT: Found ${twitterTabs.length} Twitter/X page(s):`);
      twitterTabs.forEach(tab => {
        log(`  Tab ${tab.id}: ${tab.url?.substring(0, 60)}...`);
      });
    } else {
      log(`❌ SCAN RESULT: No Twitter/X pages found`);
      log(`💡 Open x.com or twitter.com to start monitoring`);
    }
  });
};

// Keep service worker alive and log periodic status
setInterval(() => {
  const activeTabsCount = tabStatus.size;
  log(`Service worker heartbeat - tracking ${activeTabsCount} active tabs`);
  
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