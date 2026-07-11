// Global error interceptor to log all API and auth errors
// This helps track when and why the 429 error occurs

export const setupErrorInterceptor = () => {
  console.log('[ErrorInterceptor] Setting up global error interceptor...');
  
  // Intercept fetch to log all requests/responses
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource instanceof URL ? resource.toString() : (resource as Request).url);
    const method = config?.method || 'GET';
    
    try {
      const response = await originalFetch.apply(window, args as any);
      
      if (!response.ok) {
        console.log(`[Fetch] ${method} ${url} - Status: ${response.status}`);
        if (response.status === 429) {
          console.error('[Fetch] ⚠️ 429 TOO MANY REQUESTS on', method, url);
          console.error('[Fetch] Response headers:', {
            'content-type': response.headers.get('content-type'),
            'retry-after': response.headers.get('retry-after'),
            'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
            'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
          });
          
          // Log call stack to see where the 429 is coming from
          console.error('[Fetch] Call stack:');
          console.trace();
        }
      }
      
      return response;
    } catch (error) {
      console.error('[Fetch] Error on', method, url, error);
      throw error;
    }
  };
  
  console.log('[ErrorInterceptor] Global error interceptor ready\n');
};

export const DebugOutput = {
  logTokenRefresh: (source: string, reason?: string) => {
    console.error(`[TokenRefresh] ⚠️ Token refresh triggered from ${source} - ${reason || 'no reason provided'}`);
    console.trace('[TokenRefresh] Stack trace');
  },
  
  logAPICall: (method: string, url: string, body?: any) => {
    console.log(`[API] ${method} ${url}`, body ? `Body: ${JSON.stringify(body).substring(0, 100)}` : '');
  },
  
  logStorageChange: (key: string, oldValue: any, newValue: any) => {
    console.log(`[Storage] ${key} changed:`, { old: oldValue, new: newValue });
  },
  
  logAuthState: (state: any) => {
    console.log('[Auth] State changed:', state);
  }
};
