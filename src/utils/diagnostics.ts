/**
 * Diagnostic script to trace 429 errors
 * 
 * Run this in browser console after login to see where 429s are coming from
 */

// Override fetch to log all requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const isTokenRefresh = url && url.includes('/auth/v1/token');
  
  if (isTokenRefresh) {
    console.log('[DIAGNOSTIC] Token refresh attempt detected:', {
      url,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
  }
  
  return originalFetch.apply(this, args).then(response => {
    if (isTokenRefresh && response.status === 429) {
      console.error('[DIAGNOSTIC] 429 ERROR ON TOKEN REFRESH!', {
        url,
        status: response.status,
        timestamp: new Date().toISOString()
      });
    }
    return response;
  });
};

console.log('[DIAGNOSTIC] Fetch monitoring enabled. Watch for token refresh attempts.');
