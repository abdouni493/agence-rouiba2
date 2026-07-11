/**
 * Deep Debugging Utility for Auth Issues
 * This utility provides comprehensive diagnostic information about the auth state
 * Usage in browser console:
 *   - window.__DEBUG__.checkStorage()           - Show localStorage contents
 *   - window.__DEBUG__.checkSession(supabase)   - Get current session
 *   - window.__DEBUG__.checkUser(supabase)      - Get current user
 *   - window.__DEBUG__.fullDiagnostic(supabase) - Complete auth analysis
 *   - window.__DEBUG__.clearAuth()              - Clear all auth data
 */

export const DebugAuth = {
  // Log localStorage state
  checkStorage: () => {
    console.log('\n[Debug] === LOCALSTORAGE DEBUG ===');
    const allKeys = Object.keys(localStorage);
    console.log('[Debug] Total keys in localStorage:', allKeys.length);
    
    allKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('token')) {
        const value = localStorage.getItem(key);
        console.log(`[Debug] [${key}]:`, value ? `${value.substring(0, 100)}...` : 'null/empty');
      }
    });
    
    const sessionToken = localStorage.getItem('supabase.auth.token');
    console.log('[Debug] supabase.auth.token exists:', !!sessionToken);
    console.log('[Debug] supabase.auth.token length:', sessionToken?.length || 0);
    
    if (sessionToken) {
      try {
        const parsed = JSON.parse(sessionToken);
        console.log('[Debug] Token is valid JSON');
        console.log('[Debug] Token keys:', Object.keys(parsed));
      } catch {
        console.log('[Debug] Token is plain string');
      }
    }
    
    return {
      hasSessionToken: !!sessionToken,
      tokenLength: sessionToken?.length || 0,
      allKeys: allKeys
    };
  },

  // Log current session from Supabase
  checkSession: async (supabase: any) => {
    console.log('\n[Debug] === SESSION CHECK ===');
    console.log('[Debug] Calling supabase.auth.getSession()...');
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('[Debug] getSession result:', { 
        hasSession: !!data.session,
        userEmail: data.session?.user?.email,
        tokenLength: data.session?.access_token?.length,
        tokenExpiry: data.session?.expires_at ? new Date(data.session.expires_at * 1000) : null,
        refreshTokenExists: !!data.session?.refresh_token,
        error: error?.message
      });
      return data.session;
    } catch (err: any) {
      console.error('[Debug] Exception in getSession:', err.message);
      return null;
    }
  },

  // Log user state from Supabase
  checkUser: async (supabase: any) => {
    console.log('\n[Debug] === USER CHECK ===');
    console.log('[Debug] Calling supabase.auth.getUser()...');
    try {
      const { data, error } = await supabase.auth.getUser();
      console.log('[Debug] getUser result:', {
        hasUser: !!data.user,
        userEmail: data.user?.email,
        userId: data.user?.id,
        userMetadata: data.user?.user_metadata,
        error: error?.message
      });
      return data.user;
    } catch (err: any) {
      console.error('[Debug] Exception in getUser:', err.message);
      return null;
    }
  },

  // Full diagnostic
  fullDiagnostic: async (supabase: any) => {
    console.log('\n\n========== FULL AUTH DIAGNOSTIC ==========\n');
    console.log('[Debug] Timestamp:', new Date().toLocaleString());
    
    const storage = DebugAuth.checkStorage();
    console.log('\n');
    
    const session = await DebugAuth.checkSession(supabase);
    console.log('\n');
    
    const user = await DebugAuth.checkUser(supabase);
    console.log('\n');
    
    console.log('[Debug] === SUMMARY ===');
    console.log('[Debug]', {
      localStorage_has_token: storage.hasSessionToken,
      session_exists: !!session,
      user_exists: !!user,
      session_user_email: session?.user?.email,
      auth_user_email: user?.email,
      all_consistent: session?.user?.email === user?.email && !!session?.access_token
    });
    
    console.log('\n========== END DIAGNOSTIC ==========\n\n');
  },
  
  // Clear all auth data (for testing fresh login)
  clearAuth: () => {
    console.log('[Debug] === CLEARING ALL AUTH DATA ===');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.expires_at');
    sessionStorage.clear();
    console.log('[Debug] ✓ Auth data cleared');
    console.log('[Debug] Refresh the page to see changes');
  }
};

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).__DEBUG__ = DebugAuth;
  console.log('[Debug] Debug utility loaded');
  console.log('[Debug] Usage: window.__DEBUG__.fullDiagnostic(window.__supabase__) or check DevTools');
}
