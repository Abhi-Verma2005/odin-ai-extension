class LeetCodeSyncExtension {
  constructor() {
    this.backendUrl = 'http://127.0.0.1:3000/api/submit';
    this.isMonitoring = false;
    this.lastSubmittedCode = null;
    this.isProcessingSubmission = false; // Prevent multiple simultaneous submissions
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
    
  
    this.init();
  }
  
  async init() {

    
    // Check if we're on the right page
    if (!this.isLeetCodeProblemPage()) {
      console.log('❌ [CONTENT] Not on LeetCode problem page');
      return;
    }
    
    // Wait for page to load completely
    if (document.readyState === 'loading') {

      document.addEventListener('DOMContentLoaded', () => {
        this.startExtension();
      });
    } else {
      this.startExtension();
    }
  }
  
  startExtension() {

    
    // Add debugging panel
    this.addDebugPanel();
    
    // Start monitoring with delay to ensure DOM is ready
    setTimeout(() => {
      this.startMonitoring();
      this.setupSubmissionListener();
      this.updateStatus('Connected');
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

    this.updateDebugPanel('Testing', 'Manual test');
    
    // Test code extraction
    this.extractCode().then(code => {

      
      // Test problem data extraction
      const problemData = this.extractProblemData();

      
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

    return isLeetCode;
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;

    
    // Simplified observer - only watch for major result changes
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        // Only check for new result elements being added
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
      });
      
      if (shouldCheck) {

        this.checkForSuccess();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also check periodically
    setInterval(() => {
      this.checkForSuccess();
    }, 5000);
    

  }
  
  setupSubmissionListener() {

    
    // Enhanced click listener
    document.addEventListener('click', (event) => {
      const target = event.target;
      const text = target.textContent || '';
      const isSubmitButton = this.isSubmitButton(target);
      
      if (isSubmitButton) {

        
        this.handleSubmissionAttempt();
      }
    }, true); // Use capture phase
    
    // Enhanced form submission listener
    document.addEventListener('submit', (event) => {

      this.handleSubmissionAttempt();
    }, true);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {

        this.handleSubmissionAttempt();
      }
    });
    

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

    this.updateDebugPanel('Submitting', 'Code submitted');
    
    const submissionCount = parseInt(localStorage.getItem('leetcode-sync-submissions') || '0') + 1;
    localStorage.setItem('leetcode-sync-submissions', submissionCount.toString());
    
    document.getElementById('debug-submissions').textContent = `Submissions: ${submissionCount}`;
    
    // Single check after reasonable delay for result to appear
    setTimeout(() => {

      this.checkForSuccess();
    }, 3000); // 3 seconds should be enough
  }
  
  async checkForSuccess() {

    
    // Check all success indicators
    const indicators = this.getAllSuccessIndicators();

    
    if (indicators.hasSuccess) {

      this.updateDebugPanel('Success Detected', 'Processing submission');
      await this.handleSuccessfulSubmission();
    } else {

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
    // Prevent multiple simultaneous submissions
    if (this.isProcessingSubmission) {

      return;
    }
    
    this.isProcessingSubmission = true;
    
    try {

      
      const problemData = await this.extractProblemData();

      
      // Prevent duplicate submissions
      if (problemData.code && problemData.code !== this.lastSubmittedCode) {

        this.lastSubmittedCode = problemData.code;
        await this.sendToBackend(problemData);
      } else {

      }
    } catch (error) {
      console.error('❌ [CONTENT] Error in successful submission handler:', error);
      this.updateDebugPanel('Error', error.message);
    } finally {
      this.isProcessingSubmission = false;
    }
  }
  
  async extractProblemData() {

    
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

    
    // Try multiple strategies
    const strategies = [
      () => this.extractFromMonaco(),
      () => this.extractFromSolutionArea(),
      () => this.extractFromSubmissionResult(),
      () => this.extractFromReactProps(),
      () => this.extractFromCodeMirror(),
      () => this.extractFromTextarea()
    ];
    
    for (const strategy of strategies) {
      try {
        const code = await strategy();

        if (code && code.trim() && this.isValidCode(code)) {

          return code;
        }
      } catch (error) {
        // console.log('❌ [CONTENT] Strategy failed:', error.message);
      }
    }
    
    throw new Error('Could not extract code from any source');
  }
  
  isValidCode(code) {
    // Check if this looks like actual code, not arrays or other content
    const trimmedCode = code.trim();
    
    // Reject if it's just numbers or arrays
    if (/^\[\d+(?:,\d+)*\]$/.test(trimmedCode)) {
      return false; // This is an array like [100,99,98]
    }
    
    // Reject if it's just a sequence of numbers
    if (/^\d+(?:\s*,\s*\d+)*$/.test(trimmedCode)) {
      return false; // This is just numbers separated by commas
    }
    
    // Reject if it's too short
    if (trimmedCode.length < 20) {
      return false;
    }
    
    // Reject if it doesn't contain any programming keywords
    const programmingKeywords = [
      'def', 'class', 'function', 'var', 'let', 'const', 'if', 'else', 'for', 'while',
      'return', 'import', 'export', 'public', 'private', 'static', 'void', 'int',
      'string', 'boolean', 'true', 'false', 'null', 'undefined', 'try', 'catch',
      'finally', 'throw', 'new', 'this', 'super', 'extends', 'implements'
    ];
    
    const hasKeyword = programmingKeywords.some(keyword => 
      trimmedCode.toLowerCase().includes(keyword)
    );
    
    if (!hasKeyword) {
      return false;
    }
    
    // Reject if it's mostly just brackets or special characters
    const specialCharRatio = (trimmedCode.match(/[\[\]{}()<>]/g) || []).length / trimmedCode.length;
    if (specialCharRatio > 0.3) {
      return false;
    }
    
    return true;
  }
  
  extractFromMonaco() {
    if (window.monaco?.editor) {
      const editors = window.monaco.editor.getEditors();

      
      if (editors.length > 0) {
        // Try to get the main editor (usually the first one)
        const editor = editors[0];
        const model = editor.getModel();
        
        if (model) {
          const code = model.getValue();

          
          // Check if this looks like actual code (not just comments or arrays)
          if (code && code.trim() && 
              !code.includes('# The guess API is already defined for you') &&
              this.isValidCode(code)) {
            return code;
          }
        }
        
        // Try other editors if the first one didn't work
        for (let i = 1; i < editors.length; i++) {
          const editor = editors[i];
          const model = editor.getModel();
          
          if (model) {
            const code = model.getValue();

            
            if (code && code.trim() && 
                !code.includes('# The guess API is already defined for you') &&
                this.isValidCode(code)) {
              return code;
            }
          }
        }
      }
    }
    throw new Error('Monaco not available or no valid code found');
  }
  
  extractFromSolutionArea() {

    
    // Look for the actual solution code in various containers
    const solutionSelectors = [
      '[data-cy="code-editor"]',
      '.monaco-editor',
      '.editor-container',
      '[data-e2e-locator="code-editor"]',
      '.CodeMirror',
      '.ace_editor',
      '[class*="editor"]',
      '[class*="code"]'
    ];
    
    for (const selector of solutionSelectors) {
      const elements = document.querySelectorAll(selector);

      
      for (const element of elements) {
        // Try to get text content
        const textContent = element.textContent || element.innerText || '';

        
                  if (textContent && textContent.trim() && textContent.length > 50) {
            // Check if it contains actual code (not just comments or arrays)
            if (this.isValidCode(textContent)) {
              const lines = textContent.split('\n');
              const codeLines = lines.filter(line => 
                line.trim() && 
                !line.trim().startsWith('#') && 
                !line.trim().startsWith('//') &&
                !line.trim().startsWith('/*') &&
                !line.trim().startsWith('*') &&
                !line.trim().startsWith('"""') &&
                !line.trim().startsWith("'''")
              );
              
              if (codeLines.length > 2) {

                return textContent;
              }
            }
          }
      }
    }
    
    throw new Error('No solution area found');
  }
  
  extractFromSubmissionResult() {

    
    // Look for code in submission result page
    const resultSelectors = [
      '[data-cy="submission-code"]',
      '.submission-code',
      '[data-e2e-locator="submission-code"]',
      '.code-block',
      'pre code',
      '.highlight',
      '[class*="submission"]',
      '[class*="result"]'
    ];
    
    for (const selector of resultSelectors) {
      const elements = document.querySelectorAll(selector);

      
      for (const element of elements) {
        const textContent = element.textContent || element.innerText || '';

        
                  if (textContent && textContent.trim() && textContent.length > 50) {
            // Check if it contains actual code (not just arrays)
            if (this.isValidCode(textContent)) {
              const lines = textContent.split('\n');
              const codeLines = lines.filter(line => 
                line.trim() && 
                !line.trim().startsWith('#') && 
                !line.trim().startsWith('//') &&
                !line.trim().startsWith('/*') &&
                !line.trim().startsWith('*') &&
                !line.trim().startsWith('"""') &&
                !line.trim().startsWith("'''")
              );
              
              if (codeLines.length > 2) {

                return textContent;
              }
            }
          }
      }
    }
    
    throw new Error('No submission result found');
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
    
    this.updateDebugPanel('Syncing', 'Sending to backend');
    
    const authToken = await this.getAuthToken();
    
    if (!authToken) {
      throw new Error('No auth token found');
    }
    
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'send_to_backend',
          data: data,
          authToken: authToken
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
      
      this.updateDebugPanel('Synced', 'Backend sync successful');
      return response;
    } catch (error) {
      console.error('❌ [CONTENT] Backend sync failed:', error);
      this.updateDebugPanel('Error', `Backend error: ${error.message}`);
      throw error;
    }
  }
  
  updateStatus(status) {

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ syncStatus: status });
    }
  }
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {

    new LeetCodeSyncExtension();
  });
} else {

  new LeetCodeSyncExtension();
}