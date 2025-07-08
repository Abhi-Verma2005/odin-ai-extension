class LeetCodeSyncExtension {
  constructor() {
    this.backendUrl = 'http://localhost:3000/api/submit';
    this.isMonitoring = false;
    this.lastSubmittedCode = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    // Updated success selectors for modern LeetCode
    this.successSelectors = [
      // Modern LeetCode selectors
      '[data-e2e-locator="submission-result"]',
      '.text-green-600',
      '.text-green-500',
      '.text-success',
      '[data-cy="result-state"]',
      '.result-state',
      '.submission-result',
      // Legacy selectors
      '.success__3Ai7',
      '#result-state.text-success',
      '[data-cy="success-state"]',
      '.text-green-s',
      '.text-success-3',
      '.success'
    ];
    
    // Add more submission button selectors
    this.submitButtonSelectors = [
      '[data-e2e-locator="console-submit-button"]',
      '[data-cy="submit-code-btn"]',
      'button[data-cy*="submit"]',
      'button:contains("Submit")',
      '.submit-btn',
      'button[type="submit"]'
    ];
    
    console.log('🚀 [CONTENT] LeetCodeSyncExtension initialized');
    console.log('🌐 [CONTENT] Backend URL:', this.backendUrl);
    console.log('🎯 [CONTENT] Success selectors:', this.successSelectors.length);
    
    this.init();
  }
  
  async init() {
    console.log('⚡ [CONTENT] Initializing...');
    
    // Check if we're on the right page
    if (!this.isLeetCodeProblemPage()) {
      console.log('❌ [CONTENT] Not on LeetCode problem page');
      return;
    }
    
    // Wait for page to load completely
    if (document.readyState === 'loading') {
      console.log('⏳ [CONTENT] Waiting for page to load...');
      document.addEventListener('DOMContentLoaded', () => {
        this.startExtension();
      });
    } else {
      this.startExtension();
    }
  }
  
  startExtension() {
    console.log('🚀 [CONTENT] Starting extension...');
    
    // Add debugging panel
    this.addDebugPanel();
    
    // Start monitoring with delay to ensure DOM is ready
    setTimeout(() => {
      this.startMonitoring();
      this.setupSubmissionListener();
      this.updateStatus('Connected');
      console.log('✅ [CONTENT] Extension fully initialized');
    }, 1000);
  }
  
  addDebugPanel() {
    // Create floating debug panel
    const panel = document.createElement('div');
    panel.id = 'leetcode-sync-debug';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      max-height: 200px;
      overflow-y: auto;
    `;
    panel.innerHTML = `
      <div><strong>🔧 LeetCode Sync Debug</strong></div>
      <div id="debug-status">Status: Initializing...</div>
      <div id="debug-last-action">Last Action: None</div>
      <div id="debug-submissions">Submissions: 0</div>
      <button id="debug-test-btn" style="margin-top: 5px; padding: 2px 5px;">Test Detection</button>
    `;
    
    document.body.appendChild(panel);
    
    // Add test button functionality
    document.getElementById('debug-test-btn').addEventListener('click', () => {
      console.log('🧪 [CONTENT] Manual test triggered');
      this.testDetection();
    });
  }
  
  updateDebugPanel(status, action = null) {
    const statusEl = document.getElementById('debug-status');
    const actionEl = document.getElementById('debug-last-action');
    
    if (statusEl) statusEl.textContent = `Status: ${status}`;
    if (actionEl && action) actionEl.textContent = `Last Action: ${action}`;
  }
  
  testDetection() {
    console.log('🧪 [CONTENT] ===== MANUAL TEST DETECTION =====');
    this.updateDebugPanel('Testing', 'Manual test');
    
    // Test code extraction
    this.extractCode().then(code => {
      console.log('🧪 [CONTENT] Test code extraction result:', code ? 'SUCCESS' : 'FAILED');
      console.log('🧪 [CONTENT] Code length:', code?.length || 0);
      
      // Test problem data extraction
      const problemData = this.extractProblemData();
      console.log('🧪 [CONTENT] Problem data:', problemData);
      
      // Test success detection
      this.checkForSuccess();
      
      this.updateDebugPanel('Test Complete', 'Manual test completed');
    }).catch(error => {
      console.error('🧪 [CONTENT] Test failed:', error);
      this.updateDebugPanel('Test Failed', error.message);
    });
  }
  
  isLeetCodeProblemPage() {
    const url = window.location.href;
    const isLeetCode = url.includes('leetcode.com/problems/');
    console.log('🔍 [CONTENT] Page check:', { url, isLeetCode });
    return isLeetCode;
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('👀 [CONTENT] Starting DOM monitoring...');
    
    // Enhanced observer with better targeting
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        // Log significant changes
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
              const text = node.textContent || '';
              if (text.includes('Accepted') || text.includes('Wrong Answer') || 
                  text.includes('Time Limit Exceeded') || text.includes('Runtime Error')) {
                console.log('🔍 [CONTENT] Submission result detected:', text.substring(0, 50));
                shouldCheck = true;
              }
            }
          });
        }
        
        // Check for attribute changes on result elements
        if (mutation.type === 'attributes' && mutation.target.classList) {
          const classList = Array.from(mutation.target.classList);
          if (classList.some(cls => cls.includes('success') || cls.includes('accepted'))) {
            shouldCheck = true;
          }
        }
      });
      
      if (shouldCheck) {
        console.log('🔍 [CONTENT] Triggering success check due to DOM changes');
        this.checkForSuccess();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-cy', 'data-e2e-locator']
    });
    
    // Also check periodically
    setInterval(() => {
      this.checkForSuccess();
    }, 5000);
    
    console.log('✅ [CONTENT] DOM monitoring active');
  }
  
  setupSubmissionListener() {
    console.log('🎯 [CONTENT] Setting up submission listeners...');
    
    // Enhanced click listener
    document.addEventListener('click', (event) => {
      const target = event.target;
      const text = target.textContent || '';
      const isSubmitButton = this.isSubmitButton(target);
      
      if (isSubmitButton) {
        console.log('🎯 [CONTENT] SUBMIT BUTTON CLICKED!');
        console.log('🎯 [CONTENT] Button details:', {
          text: text.substring(0, 50),
          className: target.className,
          dataCy: target.getAttribute('data-cy'),
          dataE2eLocator: target.getAttribute('data-e2e-locator')
        });
        
        this.handleSubmissionAttempt();
      }
    }, true); // Use capture phase
    
    // Enhanced form submission listener
    document.addEventListener('submit', (event) => {
      console.log('📝 [CONTENT] Form submission detected');
      this.handleSubmissionAttempt();
    }, true);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        console.log('⌨️ [CONTENT] Ctrl+Enter detected');
        this.handleSubmissionAttempt();
      }
    });
    
    console.log('✅ [CONTENT] Submission listeners ready');
  }
  
  isSubmitButton(element) {
    const text = (element.textContent || '').toLowerCase();
    const className = element.className || '';
    const dataCy = element.getAttribute('data-cy') || '';
    const dataE2eLocator = element.getAttribute('data-e2e-locator') || '';
    
    return (
      text.includes('submit') ||
      className.includes('submit') ||
      dataCy.includes('submit') ||
      dataE2eLocator.includes('submit') ||
      element.closest('[data-cy*="submit"]') ||
      element.closest('[data-e2e-locator*="submit"]')
    );
  }
  
  async handleSubmissionAttempt() {
    console.log('🚀 [CONTENT] ===== SUBMISSION ATTEMPT =====');
    this.updateDebugPanel('Submitting', 'Code submitted');
    
    const submissionCount = parseInt(localStorage.getItem('leetcode-sync-submissions') || '0') + 1;
    localStorage.setItem('leetcode-sync-submissions', submissionCount.toString());
    
    document.getElementById('debug-submissions').textContent = `Submissions: ${submissionCount}`;
    
    // Wait for result with multiple checks
    const checkTimes = [2000, 5000, 8000, 12000]; // Progressive checking
    
    for (let i = 0; i < checkTimes.length; i++) {
      setTimeout(() => {
        console.log(`🔍 [CONTENT] Checking for success (attempt ${i + 1})`);
        this.checkForSuccess();
      }, checkTimes[i]);
    }
  }
  
  async checkForSuccess() {
    console.log('🔍 [CONTENT] ===== CHECKING FOR SUCCESS =====');
    
    // Check all success indicators
    const indicators = this.getAllSuccessIndicators();
    console.log('📊 [CONTENT] Success indicators:', indicators);
    
    if (indicators.hasSuccess) {
      console.log('🎉 [CONTENT] SUCCESS DETECTED!');
      this.updateDebugPanel('Success Detected', 'Processing submission');
      await this.handleSuccessfulSubmission();
    } else {
      console.log('⏳ [CONTENT] No success detected yet');
      this.updateDebugPanel('Monitoring', 'Waiting for result');
    }
  }
  
  getAllSuccessIndicators() {
    const indicators = {
      hasSuccess: false,
      foundSelectors: [],
      hasAcceptedText: false,
      hasSuccessInResult: false,
      pageText: ''
    };
    
    // Check CSS selectors
    this.successSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          indicators.foundSelectors.push(selector);
          indicators.hasSuccess = true;
          console.log('✅ [CONTENT] Found success selector:', selector);
        }
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    // Check for "Accepted" text
    const pageText = document.body.textContent || '';
    indicators.pageText = pageText.substring(0, 200);
    indicators.hasAcceptedText = pageText.includes('Accepted');
    
    // Check specific result areas
    const resultSelectors = [
      '[data-e2e-locator="submission-result"]',
      '.submission-result',
      '.result-state',
      '[data-cy="result"]'
    ];
    
    resultSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || '';
        if (text.includes('Accepted') || text.includes('Success')) {
          indicators.hasSuccessInResult = true;
          indicators.hasSuccess = true;
        }
      }
    });
    
    if (indicators.hasAcceptedText) {
      indicators.hasSuccess = true;
    }
    
    return indicators;
  }
  
  async handleSuccessfulSubmission() {
    try {
      console.log('🎉 [CONTENT] Processing successful submission...');
      
      const problemData = await this.extractProblemData();
      console.log('📋 [CONTENT] Problem data extracted:', {
        slug: problemData.slug,
        language: problemData.language,
        codeLength: problemData.code?.length || 0
      });
      
      if (problemData.code) {
        console.log('📤 [CONTENT] Sending to backend...');
        this.lastSubmittedCode = problemData.code;
        await this.sendToBackend(problemData);
      } else {
        console.log('⚠️ [CONTENT] Duplicate or empty code, skipping');
      }
    } catch (error) {
      console.error('❌ [CONTENT] Error in successful submission handler:', error);
      this.updateDebugPanel('Error', error.message);
    }
  }
  
  async extractProblemData() {
    console.log('📋 [CONTENT] Extracting problem data...');
    
    const code = await this.extractCode();
    const problemSlug = this.extractProblemSlug();
    const problemTitle = this.extractProblemTitle();
    const language = this.extractLanguage();
    
    return {
      slug: problemSlug,
      code: code,
      language: language,
      timestamp: new Date().toISOString(),
      problemTitle: problemTitle
    };
  }
  
  async extractCode() {
    console.log('💻 [CONTENT] Extracting code...');
    
    // Try multiple strategies
    const strategies = [
      () => this.extractFromMonaco(),
      () => this.extractFromReactProps(),
      () => this.extractFromCodeMirror(),
      () => this.extractFromTextarea()
    ];
    
    for (const strategy of strategies) {
      try {
        const code = await strategy();
        if (code && code.trim()) {
          console.log('✅ [CONTENT] Code extracted successfully');
          return code;
        }
      } catch (error) {
        console.log('❌ [CONTENT] Strategy failed:', error.message);
      }
    }
    
    throw new Error('Could not extract code from any source');
  }
  
  extractFromMonaco() {
    if (window.monaco?.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors.length > 0) {
        const code = editors[0].getModel()?.getValue();
        if (code) return code;
      }
    }
    throw new Error('Monaco not available');
  }
  
  extractFromReactProps() {
    // Try to find React components with code
    const codeElements = document.querySelectorAll('[data-cy*="code"], [data-e2e-locator*="code"]');
    for (const element of codeElements) {
      const reactProps = element._reactInternalFiber || element._reactInternalInstance;
      if (reactProps?.memoizedProps?.value) {
        return reactProps.memoizedProps.value;
      }
    }
    throw new Error('React props not found');
  }
  
  extractFromCodeMirror() {
    const codeMirror = document.querySelector('.CodeMirror');
    if (codeMirror?.CodeMirror) {
      return codeMirror.CodeMirror.getValue();
    }
    throw new Error('CodeMirror not found');
  }
  
  extractFromTextarea() {
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
      if (textarea.value?.trim()) {
        return textarea.value;
      }
    }
    throw new Error('No textarea with code found');
  }
  
  extractProblemSlug() {
    const match = window.location.href.match(/\/problems\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
  
  extractProblemTitle() {
    const selectors = [
      '[data-cy="question-title"]',
      '.question-title',
      'h1',
      '.css-v3d350'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    
    return document.title.replace(' - LeetCode', '');
  }
  
  extractLanguage() {
    const selectors = [
      '[data-cy="lang-select"] .ant-select-selection-item',
      '.language-select .selected',
      '.editor-language'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim().toLowerCase();
      }
    }
    
    return 'python';
  }
  
  async getAuthToken() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['authToken'], (result) => {
          resolve(result.authToken);
        });
      } else {
        // Fallback for testing
        resolve(localStorage.getItem('authToken'));
      }
    });
  }
  
  async sendToBackend(data) {
    console.log('📡 [CONTENT] Sending to backend...');
    this.updateDebugPanel('Syncing', 'Sending to backend');
    
    const authToken = await this.getAuthToken();
    
    if (!authToken) {
      throw new Error('No auth token found');
    }
    
    try {
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [CONTENT] Backend sync successful:', result);
      this.updateDebugPanel('Synced', 'Backend sync successful');
      
      return result;
    } catch (error) {
      console.error('❌ [CONTENT] Backend sync failed:', error);
      this.updateDebugPanel('Error', `Backend error: ${error.message}`);
      throw error;
    }
  }
  
  updateStatus(status) {
    console.log(`📊 [CONTENT] Status: ${status}`);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ syncStatus: status });
    }
  }
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [CONTENT] DOM loaded, initializing extension...');
    new LeetCodeSyncExtension();
  });
} else {
  console.log('🚀 [CONTENT] Document ready, initializing extension...');
  new LeetCodeSyncExtension();
}