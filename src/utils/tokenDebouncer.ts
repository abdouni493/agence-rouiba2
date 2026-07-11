// Token refresh debouncer to prevent 429 rate limit errors
// Ensures token refresh only happens once per interval, not multiple times rapidly

let lastRefreshTime = 0;
const REFRESH_DEBOUNCE_MS = 60000; // 60 seconds - Supabase rate limit recovery time

export const setupTokenRefreshDebouncer = (supabaseClient: any) => {
  if (!supabaseClient.auth) return;

  console.log('[TokenDebouncer] Setting up token refresh debouncer');

  // Intercept the refresh token method
  const originalRefresh = supabaseClient.auth._refreshAccessToken;

  if (originalRefresh) {
    supabaseClient.auth._refreshAccessToken = async function (...args: any[]) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;

      if (timeSinceLastRefresh < REFRESH_DEBOUNCE_MS) {
        console.log(
          `[TokenDebouncer] Skipping refresh - only ${timeSinceLastRefresh}ms since last refresh (need ${REFRESH_DEBOUNCE_MS}ms)`
        );
        // Return a dummy success to prevent errors
        return { session: null, error: null };
      }

      console.log(`[TokenDebouncer] Allowing refresh - ${timeSinceLastRefresh}ms since last refresh`);
      lastRefreshTime = now;

      try {
        const result = await originalRefresh.apply(this, args);
        return result;
      } catch (error) {
        console.error('[TokenDebouncer] Refresh error:', error);
        throw error;
      }
    };
  }

  console.log('[TokenDebouncer] Debouncer installed');
};

// Reset debouncer (useful for testing)
export const resetTokenDebouncer = () => {
  lastRefreshTime = 0;
  console.log('[TokenDebouncer] Debouncer reset');
};
