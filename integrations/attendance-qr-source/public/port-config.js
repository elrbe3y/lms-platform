/**
 * Dynamic Port Configuration
 * Automatically detects and loads the correct server port
 */

let API_PORT = 3000; // Default port
let API_BASE_URL = `http://localhost:${API_PORT}`;

/**
 * Initialize port configuration
 * Detects the actual running server port
 */
async function initializePortConfig() {
  try {
    // Try to fetch the port from the API
    const response = await fetch('http://localhost:3000/api/config/port', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      API_PORT = data.port;
      API_BASE_URL = `http://localhost:${API_PORT}`;
      console.log(`✅ Server port detected: ${API_PORT}`);
      return true;
    }
  } catch (error) {
    // If port 3000 fails, try to find which port is running
    console.log('⚠️  Port 3000 not responding, scanning nearby ports...');
    
    for (let port = 3000; port < 3020; port++) {
      try {
        const response = await fetch(`http://localhost:${port}/api/config/port`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(500)
        });
        
        if (response.ok) {
          API_PORT = port;
          API_BASE_URL = `http://localhost:${API_PORT}`;
          console.log(`✅ Server found on port: ${API_PORT}`);
          return true;
        }
      } catch (err) {
        // Continue to next port
      }
    }
    
    console.warn('⚠️  Could not detect server port, using default 3000');
  }
  return false;
}

/**
 * Get API base URL
 */
function getApiBaseUrl() {
  return API_BASE_URL;
}

/**
 * Get API port
 */
function getApiPort() {
  return API_PORT;
}

/**
 * Make API fetch request
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`📡 API Call: ${url}`);
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
}

// Initialize on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePortConfig);
} else {
  initializePortConfig();
}

// Export for use in other scripts
window.portConfig = {
  initialize: initializePortConfig,
  getBaseUrl: getApiBaseUrl,
  getPort: getApiPort,
  fetch: apiFetch,
  get API_BASE_URL() { return API_BASE_URL; },
  get API_PORT() { return API_PORT; }
};
