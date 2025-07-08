// Background service worker for LeetCode Sync Extension
class BackgroundService {
  constructor() {
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.initializeStorage();
  }
  
  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('LeetCode Sync Extension installed');
      this.handleInstallation(details);
    });
    
    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('LeetCode Sync Extension started');
    });
    
    // Handle messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
    
    // Handle tab updates to check for LeetCode pages
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('leetcode.com/problems/')) {
        console.log('LeetCode problem page detected:', tab.url);
        // Content script is automatically injected via manifest.json
        // No need to manually inject it
      }
    });
  }
  
  async initializeStorage() {
    const defaultData = {
      syncStatus: 'Idle',
      problemsSynced: 0,
      lastSync: null,
      settings: {
        backendUrl: 'http://localhost:3000/api/solution',
        authCookieName: 'token',
        autoSync: true,
        retryAttempts: 3
      }
    };
    
    const stored = await this.getStoredData();
    const dataToStore = { ...defaultData, ...stored };
    
    await this.setStoredData(dataToStore);
    console.log('Storage initialized with default data');
  }
  
  handleInstallation(details) {
    if (details.reason === 'install') {
      // First installation
      console.log('First installation detected');
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Extension updated to version', chrome.runtime.getManifest().version);
    }
  }
  
  async handleMessage(request, sender, sendResponse) {
    console.log('Background received message:', request.action, request);
    
    try {
      switch (request.action) {
        case 'sync_success':
          await this.handleSyncSuccess(request.data);
          sendResponse({ success: true });
          break;
          
        case 'sync_error':
          await this.handleSyncError(request.error);
          sendResponse({ success: true });
          break;
          
        case 'get_settings':
          const settings = await this.getSettings();
          sendResponse({ settings });
          break;
          
        case 'update_settings':
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;
          
        default:
          console.warn('Unknown action received:', request.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }
  
  async handleSyncSuccess(data) {
    console.log('Handling sync success:', data);
    
    const stored = await this.getStoredData();
    const newCount = (stored.problemsSynced || 0) + 1;
    
    await this.setStoredData({
      syncStatus: 'Synced',
      problemsSynced: newCount,
      lastSync: new Date().toISOString()
    });
    
    console.log('Sync data updated. New count:', newCount);
    
    // Show success notification
    this.showNotification('Sync Successful', 
      `Problem "${data.problemTitle}" synced to your AI tutor!`);
  }
  
  async handleSyncError(error) {
    console.error('Handling sync error:', error);
    
    await this.setStoredData({
      syncStatus: 'Error'
    });
    
    // Show error notification
    this.showNotification('Sync Error', 
      `Failed to sync: ${error.message}`);
  }
  
  async getSettings() {
    const stored = await this.getStoredData();
    return stored.settings || {};
  }
  
  async updateSettings(newSettings) {
    console.log('Updating settings:', newSettings);
    
    const stored = await this.getStoredData();
    const updatedSettings = { ...stored.settings, ...newSettings };
    
    await this.setStoredData({
      settings: updatedSettings
    });
    
    console.log('Settings updated successfully');
  }
  
  showWelcomeNotification() {
    console.log('Showing welcome notification');
    this.showNotification('Welcome to LeetCode Sync!', 
      'Your solutions will now be automatically synced to your AI tutor.');
  }
  
  showNotification(title, message) {
    console.log('Showing notification:', title, message);
    
    // Check if notifications are supported
    if (!chrome.notifications) {
      console.warn('Notifications not available');
      return;
    }
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message
    });
  }
  
  async getStoredData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
  }
  
  async setStoredData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }
}

// Initialize background service
console.log('Background service initializing...');
new BackgroundService();
console.log('Background service initialized');