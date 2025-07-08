class PopupManager {
  constructor() {
    this.backendUrl = 'http://127.0.0.1:3000/api'; // Update with your actual backend URL
    this.isAuthenticated = false;
    
    // DOM elements
    this.authSection = document.getElementById('auth-section');
    this.statusSection = document.getElementById('status-section');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.loginBtn = document.getElementById('login-btn');
    this.loginText = document.getElementById('login-text');
    this.authMessage = document.getElementById('auth-message');
    this.infoMessage = document.getElementById('info-message');
    
    // Status elements
    this.statusElement = document.getElementById('sync-status');
    this.lastSyncElement = document.getElementById('last-sync');
    this.problemsSyncedElement = document.getElementById('problems-synced');
    this.statusIndicator = document.getElementById('status-indicator');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    
    this.init();
  }
  
  async init() {
    this.setupEventListeners();
    await this.checkAuthStatus();
    
    // Update UI every 5 seconds if authenticated
    if (this.isAuthenticated) {
      setInterval(() => this.updateUI(), 5000);
    }
  }
  
  setupEventListeners() {
    // Login form
    this.loginBtn.addEventListener('click', () => this.handleLogin());
    this.emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    // Status section
    this.refreshBtn.addEventListener('click', () => this.updateUI());
    this.logoutBtn.addEventListener('click', () => this.handleLogout());
  }
  
  async checkAuthStatus() {
    console.log('🔍 [AUTH_CHECK] Starting auth status check...');
    try {
      const stored = await this.getStoredData();
      console.log('📋 [AUTH_CHECK] Retrieved stored data:', {
        hasAuthToken: !!stored.authToken,
        hasUserEmail: !!stored.userEmail,
        hasUserName: !!stored.userName,
        hasUserId: !!stored.userId,
        hasLoginTime: !!stored.loginTime,
        totalKeys: Object.keys(stored).length
      });
      
      const token = stored.authToken;
      
      if (token) {
        console.log(' [AUTH_CHECK] Found stored token, validating...');
        const isValid = this.isValidToken(token);
        console.log('✅ [AUTH_CHECK] Token validation result:', isValid);
        
        if (isValid) {
          console.log(' [AUTH_CHECK] Token is valid, user is authenticated');
          this.isAuthenticated = true;
          this.showStatusSection();
          await this.updateUI();
        } else {
          console.log('❌ [AUTH_CHECK] Token is invalid or expired');
          this.isAuthenticated = false;
          this.showAuthSection();
        }
      } else {
        console.log('❌ [AUTH_CHECK] No stored token found');
        this.isAuthenticated = false;
        this.showAuthSection();
      }
    } catch (error) {
      console.error('💥 [AUTH_CHECK] Error checking auth status:', error);
      this.showAuthSection();
    }
  }
  
  isValidToken(token) {
    console.log('🔐 [TOKEN_VALIDATION] Validating token...');
    try {
      const parts = token.split('.');
      console.log('🔐 [TOKEN_VALIDATION] Token parts:', parts.length);
      
      if (parts.length !== 3) {
        console.log('❌ [TOKEN_VALIDATION] Invalid token format (not 3 parts)');
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      console.log('🔐 [TOKEN_VALIDATION] Token payload:', {
        exp: payload.exp,
        iat: payload.iat,
        sub: payload.sub,
        hasExp: 'exp' in payload
      });
      
      const now = Math.floor(Date.now() / 1000);
      console.log('⏰ [TOKEN_VALIDATION] Current time:', now);
      console.log('⏰ [TOKEN_VALIDATION] Token expires at:', payload.exp);
      console.log('⏰ [TOKEN_VALIDATION] Time until expiry:', payload.exp - now, 'seconds');
      
      const isValid = payload.exp > now;
      console.log('✅ [TOKEN_VALIDATION] Token is valid:', isValid);
      return isValid;
    } catch (error) {
      console.error('💥 [TOKEN_VALIDATION] Error parsing token:', error);
      return false;
    }
  }
  
  async handleLogin() {
    console.log('🔐 [LOGIN] Starting login process...');
    
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value.trim();
    
    console.log('📧 [LOGIN] Email input:', email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : 'empty');
    console.log('🔑 [LOGIN] Password provided:', password ? 'Yes' : 'No');
    
    if (!email || !password) {
      console.log('❌ [LOGIN] Validation failed: Missing email or password');
      this.showMessage('Please enter both email and password', 'error');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      console.log('❌ [LOGIN] Validation failed: Invalid email format');
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }
    
    console.log('✅ [LOGIN] Input validation passed');
    console.log('🔄 [LOGIN] Setting loading state...');
    this.setLoading(true);
    
    try {
      const requestUrl = `${this.backendUrl}/solution/`;
      console.log('🌐 [LOGIN] Backend URL:', this.backendUrl);
      console.log('🔄 [LOGIN] Making API request to:', requestUrl);
      console.log('📤 [LOGIN] Request payload:', { email: `${email.substring(0, 3)}***@${email.split('@')[1]}`, password: '***' });
      
      // Test if backend is reachable first
      // console.log('🔍 [LOGIN] Testing backend connectivity...');
      // try {
      //   const testResponse = await fetch(this.backendUrl, { method: 'HEAD' });
      //   console.log('✅ [LOGIN] Backend is reachable, status:', testResponse.status);
      // } catch (testError) {
      //   console.error('❌ [LOGIN] Backend connectivity test failed:', testError);
      //   console.log('💡 [LOGIN] This suggests the backend server is not running or not accessible');
      // }
      
      const startTime = Date.now();
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const endTime = Date.now();
      console.log(`⏱️ [LOGIN] API response time: ${endTime - startTime}ms`);
      console.log('📥 [LOGIN] Response status:', response.status);
      console.log('📥 [LOGIN] Response status text:', response.statusText);
      console.log('📥 [LOGIN] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.log('❌ [LOGIN] HTTP error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📄 [LOGIN] Response data structure:', {
        hasSuccess: 'success' in data,
        hasToken: 'token' in data,
        hasUser: 'user' in data,
        hasMessage: 'message' in data,
        successValue: data.success,
        tokenLength: data.token ? data.token.length : 0,
        userFields: data.user ? Object.keys(data.user) : null
      });
      
      if (data.success && data.token) {

        console.log('👤 [LOGIN] User info:', {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || 'Not provided'
        });
        
        const authData = {
          authToken: data.token,
          userEmail: data.user.email,
          userName: data.user.name || '',
          userId: data.user.id,
          loginTime: new Date().toISOString()
        };
        
        console.log('💾 [LOGIN] Storing auth data...');
        await this.storeAuthData(authData);

        
        this.isAuthenticated = true;
        console.log('🔓 [LOGIN] Authentication state updated to true');
        this.showMessage('Login successful!', 'success');
        
        // Clear form
        console.log('🧹 [LOGIN] Clearing form inputs...');
        this.emailInput.value = '';
        this.passwordInput.value = '';
        
        // Switch to status view
        console.log('🔄 [LOGIN] Switching to status view in 1 second...');
        setTimeout(() => {
          console.log('📊 [LOGIN] Showing status section...');
          this.showStatusSection();
          console.log('🔄 [LOGIN] Updating UI...');
          this.updateUI();
        }, 1000);
        
      } else {
        console.log('❌ [LOGIN] Login failed:', {
          success: data.success,
          message: data.message,
          hasToken: !!data.token
        });
        this.showMessage(data.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('💥 [LOGIN] Login error:', error);
      console.log('🔍 [LOGIN] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      // More specific error messages based on error type
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('🌐 [LOGIN] Network connectivity issue detected');
        this.showMessage('Cannot connect to server. Please check if the backend is running.', 'error');
      } else if (error.message.includes('CORS')) {
        console.log('🌐 [LOGIN] CORS issue detected');
        this.showMessage('CORS error. Please check server configuration.', 'error');
      } else {
        this.showMessage('Network error. Please try again.', 'error');
      }
    } finally {
      console.log('🔄 [LOGIN] Clearing loading state...');
      this.setLoading(false);
      console.log('🏁 [LOGIN] Login process completed');
    }
  }
  
  async handleLogout() {
    try {
      // Clear stored data
      await chrome.storage.local.clear();
      
      this.isAuthenticated = false;
      this.showMessage('Logged out successfully', 'success');
      
      setTimeout(() => {
        this.showAuthSection();
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      this.showMessage('Error logging out', 'error');
    }
  }
  
  async updateUI() {
    if (!this.isAuthenticated) return;
    
    try {
      const data = await this.getStoredData();
      this.updateStatus(data.syncStatus || 'Idle');
      this.updateLastSync(data.lastSync);
      this.updateProblemCount(data.problemsSynced || 0);
      
      // Update info message
      this.infoMessage.textContent = 
        'Navigate to any LeetCode problem and submit your solution. Your code will be automatically synced to your AI tutor.';
        
    } catch (error) {
      console.error('Error updating UI:', error);
      this.updateStatus('Error');
    }
  }
  
  showAuthSection() {
    this.authSection.classList.remove('hidden');
    this.statusSection.classList.add('hidden');
    this.infoMessage.textContent = 'Please log in to sync your LeetCode solutions to your AI tutor.';
  }
  
  showStatusSection() {
    this.authSection.classList.add('hidden');
    this.statusSection.classList.remove('hidden');
  }
  
  showMessage(message, type) {
    this.authMessage.innerHTML = `
      <div class="${type}-message">
        ${message}
      </div>
    `;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      this.authMessage.innerHTML = '';
    }, 5000);
  }
  
  setLoading(isLoading) {
    if (isLoading) {
      this.loginBtn.disabled = true;
      this.loginText.innerHTML = '<span class="loading"></span>Logging in...';
    } else {
      this.loginBtn.disabled = false;
      this.loginText.textContent = 'Login';
    }
  }
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  async storeAuthData(data) {
    console.log('💾 [STORAGE] Starting to store auth data...');
    console.log('📋 [STORAGE] Data to store:', {
      hasAuthToken: !!data.authToken,
      hasUserEmail: !!data.userEmail,
      hasUserName: !!data.userName,
      hasUserId: !!data.userId,
      hasLoginTime: !!data.loginTime,
      tokenLength: data.authToken ? data.authToken.length : 0
    });
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error('❌ [STORAGE] Error storing data:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
  
          resolve();
        }
      });
    });
  }
  
  async getStoredData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
  }
  
  updateStatus(status) {
    this.statusElement.textContent = status;
    
    // Update indicator
    this.statusIndicator.className = 'status-indicator';
    
    switch (status.toLowerCase()) {
      case 'connected':
        this.statusIndicator.classList.add('connected');
        break;
      case 'syncing':
        this.statusIndicator.classList.add('syncing');
        break;
      case 'synced':
        this.statusIndicator.classList.add('connected');
        this.statusElement.textContent = 'Connected';
        break;
      case 'error':
        this.statusIndicator.classList.add('error');
        break;
      default:
        this.statusIndicator.classList.add('idle');
    }
  }
  
  updateLastSync(lastSync) {
    if (!lastSync) {
      this.lastSyncElement.textContent = 'Never';
      return;
    }
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);
    
    if (diffInMinutes < 1) {
      this.lastSyncElement.textContent = 'Just now';
    } else if (diffInMinutes < 60) {
      this.lastSyncElement.textContent = `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      this.lastSyncElement.textContent = `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      this.lastSyncElement.textContent = `${days}d ago`;
    }
  }
  
  updateProblemCount(count) {
    this.problemsSyncedElement.textContent = count.toString();
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Listen for storage changes and update UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Trigger UI update when storage changes
    setTimeout(() => {
      const event = new CustomEvent('storageChanged');
      document.dispatchEvent(event);
    }, 100);
  }
});

// Handle storage change events
document.addEventListener('storageChanged', () => {
  const popup = document.querySelector('body');
  if (popup) {
    // Re-initialize popup manager to reflect changes
    new PopupManager();
  }
});