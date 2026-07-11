/**
 * Auth utilities to prevent Supabase 429 rate limiting errors
 * These utilities ensure we don't trigger too many token refresh requests
 */

let lastRefreshTime = 0;
const MINIMUM_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour - match Supabase token lifespan

/**
 * Check if enough time has passed to safely refresh the token
 * This prevents aggressive refresh attempts that cause 429 errors
 */
export const shouldRefreshToken = (): boolean => {
  const now = Date.now();
  const timeSinceLastRefresh = now - lastRefreshTime;
  
  // Only allow refresh if at least 1 hour has passed
  return timeSinceLastRefresh >= MINIMUM_REFRESH_INTERVAL;
};

/**
 * Mark that a token refresh was attempted
 * This is called after a successful refresh to prevent retries
 */
export const markTokenRefresh = (): void => {
  lastRefreshTime = Date.now();
};

/**
 * Reset the refresh timer (useful after logout)
 */
export const resetTokenRefreshTimer = (): void => {
  lastRefreshTime = 0;
};

/**
 * Handle Supabase auth errors gracefully without triggering rate limits
 */
export const handleAuthError = (error: any): string => {
  if (!error) return 'Unknown error';
  
  const message = error.message || error;
  
  // 429 = Too Many Requests (rate limited)
  if (message.includes('429') || message.includes('Too Many Requests')) {
    return 'Rate limited - please wait a moment before trying again';
  }
  
  // JWT/Session errors
  if (message.includes('JWT') || message.includes('expired')) {
    return 'Session has expired - please log in again';
  }
  
  // Database auth errors
  if (message.includes('PGRST301') || message.includes('auth')) {
    return 'Authentication failed - please log in again';
  }
  
  return message;
};

/**
 * Wrapper to prevent excessive API calls with automatic backoff
 */
export const withRateLimitBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> => {
  let lastError: any;
  let delay = 1000; // Start with 1 second delay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const message = error.message || '';
      
      // Don't retry on auth/JWT errors
      if (message.includes('JWT') || message.includes('auth')) {
        throw error;
      }
      
      // Back off if rate limited
      if (message.includes('429')) {
        if (attempt < maxRetries) {
          console.warn(`Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
};
