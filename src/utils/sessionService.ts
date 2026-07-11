import { supabase } from '../supabase';

/**
 * Session Service - Database-backed session management
 * 
 * This replaces the Supabase SDK's auto-refresh mechanism with a database-backed
 * solution that prevents 429 rate limit errors and ensures proper session persistence.
 */

interface SessionData {
  sessionId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  email: string;
  role: string;
  name: string;
}

const SESSION_STORAGE_KEY = 'admin_session_v2';
const SESSION_VALIDATION_INTERVAL = 5 * 60 * 1000; // Validate every 5 minutes
const REFRESH_THRESHOLD = 5 * 60; // Refresh if within 5 minutes of expiry

class SessionService {
  private validationTimer: NodeJS.Timeout | null = null;
  private lastRefreshTime = 0;
  private minRefreshInterval = 60 * 1000; // Don't refresh more than once per minute

  /**
   * Create a new session after successful login
   */
  async createSession(
    accessToken: string,
    refreshToken: string | undefined,
    expiresAt: number,
    userId: string,
    email: string,
    role: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[SessionService] Creating new session...');

      // Save to localStorage (primary storage)
      const sessionData: SessionData = {
        sessionId: `session_${Date.now()}`,
        accessToken,
        refreshToken,
        expiresAt,
        userId,
        email,
        role,
        name
      };

      // Ensure it's saved synchronously
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      
      // Verify it was saved
      const verified = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!verified) {
        throw new Error('Failed to save session to localStorage');
      }
      
      console.log('[SessionService] Session saved to localStorage:', {
        userId,
        email,
        expiresAt,
        storageKey: SESSION_STORAGE_KEY
      });

      // Try to save to database (optional - for audit trail)
      this.saveSessionToDatabase(sessionData).catch(err => {
        console.warn('[SessionService] Could not save to database (non-blocking):', err);
      });

      // Start validation loop
      this.startSessionValidation();

      return { success: true };
    } catch (error) {
      console.error('[SessionService] Error creating session:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Save session to database for audit trail (non-blocking)
   * This is optional - localStorage is the primary storage
   */
  private async saveSessionToDatabase(session: SessionData): Promise<void> {
    try {
      // Only attempt to save to database if we have valid auth context
      // The RPC function uses auth.uid(), so we need to be authenticated
      const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !authSession) {
        console.log('[SessionService] Skipping database save - no Supabase auth context');
        return;
      }

      const { error } = await supabase.rpc('create_admin_session', {
        p_access_token: session.accessToken,
        p_refresh_token: session.refreshToken,
        p_expires_at: session.expiresAt,
        p_user_agent: navigator.userAgent,
        p_ip_address: null
      });

      if (error) {
        // Silently fail - database save is optional, localStorage is primary
        console.warn('[SessionService] Failed to save to database:', error.message);
        return;
      }

      console.log('[SessionService] Session also saved to database (audit trail)');
    } catch (error) {
      // Silently fail - localStorage persistence is sufficient
      console.warn('[SessionService] Error saving to database:', error);
    }
  }

  /**
   * Get current session from localStorage (with optional database validation)
   */
  async getCurrentSession(): Promise<SessionData | null> {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (!stored) {
        console.log('[SessionService] No session found in localStorage. Available keys:', Object.keys(localStorage).filter(k => k.includes('session') || k.includes('auth')));
        return null;
      }

      console.log('[SessionService] Session data found in localStorage, parsing...');
      const session: SessionData = JSON.parse(stored);
      
      console.log('[SessionService] Parsed session:', {
        email: session.email,
        role: session.role,
        userId: session.userId,
        expiresAt: session.expiresAt
      });
      
      // Check if expired - DON'T call invalidateSession here to avoid infinite recursion
      const now = Math.floor(Date.now() / 1000);
      const secondsUntilExpiry = session.expiresAt - now;
      
      if (secondsUntilExpiry <= 0) {
        console.log('[SessionService] Session has expired (expires in', secondsUntilExpiry, 'seconds)');
        // Clear the expired session
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      console.log('[SessionService] Session retrieved from localStorage (expires in', secondsUntilExpiry, 'seconds)');
      return session;
    } catch (error) {
      console.error('[SessionService] Error getting current session:', error);
      // If parsing fails, clear the corrupted session
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {
        console.error('[SessionService] Error clearing corrupted session:', e);
      }
      return null;
    }
  }

  /**
   * Validate session with database - with fallback to localStorage check
   */
  async validateSession(token: string): Promise<boolean> {
    // La validation se fait localement (contrôle d'expiration). Une ancienne
    // version appelait un RPC `validate_session` qui n'existe pas côté base :
    // cela provoquait une erreur 404 bruyante à chaque contrôle, alors que
    // c'est bien la vérification locale ci-dessous qui protège réellement
    // l'accès. On s'appuie donc directement dessus.
    console.log('[SessionService] Validating session (local expiry check)...');
    return this.validateSessionLocally(token);
  }

  /**
   * Validate session locally by checking expiration
   */
  private validateSessionLocally(token: string): boolean {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return false;

      const session: SessionData = JSON.parse(stored);
      const now = Math.floor(Date.now() / 1000);
      const secondsUntilExpiry = session.expiresAt - now;

      // Token is valid if not expired
      const isValid = secondsUntilExpiry > 0;
      console.log('[SessionService] Local validation:', {
        isValid,
        secondsUntilExpiry,
        expiresAt: session.expiresAt,
        now
      });

      if (!isValid) {
        console.log('[SessionService] Session has expired locally');
        this.invalidateSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SessionService] Local validation error:', error);
      return false;
    }
  }

  /**
   * Invalidate current session (on logout or expiry)
   */
  async invalidateSession(): Promise<void> {
    try {
      // Get stored session without calling getCurrentSession (to avoid recursion)
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) {
        console.log('[SessionService] No session to invalidate');
        this.stopSessionValidation();
        return;
      }

      const session: SessionData = JSON.parse(stored);
      console.log('[SessionService] Invalidating session for user:', session.email);

      // Pas d'appel à un RPC `invalidate_session` (inexistant côté base, ce qui
      // générait un 404 à chaque déconnexion) : le nettoyage du localStorage
      // ci-dessous est ce qui invalide réellement la session côté client.

      // Clear localStorage
      localStorage.removeItem(SESSION_STORAGE_KEY);
      console.log('[SessionService] Session cleared from localStorage');

      // Stop validation loop
      this.stopSessionValidation();
    } catch (error) {
      console.error('[SessionService] Error invalidating session:', error);
      // Force clear localStorage anyway
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {
        console.error('[SessionService] Error clearing localStorage:', e);
      }
      this.stopSessionValidation();
    }
  }

  /**
   * Refresh session token (only if close to expiry)
   */
  async refreshSessionToken(): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await this.getCurrentSession();
      if (!session || !session.refreshToken) {
        return { success: false, error: 'No session or refresh token' };
      }

      // Don't refresh more than once per minute
      const now = Date.now();
      if (now - this.lastRefreshTime < this.minRefreshInterval) {
        console.log('[SessionService] Refresh blocked - too soon since last refresh');
        return { success: false, error: 'Refresh rate limited' };
      }

      const secondsUntilExpiry = session.expiresAt - Math.floor(Date.now() / 1000);
      console.log(`[SessionService] Token expires in ${secondsUntilExpiry} seconds`);

      // Only refresh if within threshold
      if (secondsUntilExpiry > REFRESH_THRESHOLD) {
        console.log('[SessionService] Token still valid, no refresh needed');
        return { success: true };
      }

      console.log('[SessionService] Token close to expiry, attempting refresh...');
      this.lastRefreshTime = now;

      // Use Supabase SDK to refresh (now with controlled rate)
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refreshToken
      });

      if (error || !data.session) {
        console.error('[SessionService] Refresh failed:', error);
        await this.invalidateSession();
        return { success: false, error: String(error) };
      }

      // Update session with new token
      const newSession = data.session;
      await this.createSession(
        newSession.access_token,
        newSession.refresh_token || session.refreshToken,
        newSession.expires_at || session.expiresAt,
        session.userId,
        session.email,
        session.role,
        session.name
      );

      console.log('[SessionService] Token refreshed successfully');
      return { success: true };
    } catch (error) {
      console.error('[SessionService] Refresh error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Start periodic session validation
   */
  private startSessionValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }

    console.log('[SessionService] Starting session validation loop (5-minute interval)');

    this.validationTimer = setInterval(async () => {
      const session = await this.getCurrentSession();
      
      // If no session, stop the loop
      if (!session) {
        console.log('[SessionService] No session found, stopping validation loop');
        this.stopSessionValidation();
        return;
      }

      // Validate and potentially refresh
      const isValid = await this.validateSession(session.accessToken);
      if (!isValid) {
        console.log('[SessionService] Session validation failed, stopping loop');
        this.stopSessionValidation();
        return;
      }
      
      // Try to refresh if needed
      await this.refreshSessionToken();
    }, SESSION_VALIDATION_INTERVAL);
  }

  /**
   * Stop session validation
   */
  private stopSessionValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
      console.log('[SessionService] Session validation stopped');
    }
  }

  /**
   * Initialize session on app load
   */
  async initializeSession(): Promise<SessionData | null> {
    console.log('[SessionService] Initializing session...');

    const session = await this.getCurrentSession();
    if (!session) {
      console.log('[SessionService] No valid session found in localStorage');
      return null;
    }

    console.log('[SessionService] Session found:', { email: session.email, role: session.role });
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt <= now) {
      console.log('[SessionService] Session has expired');
      await this.invalidateSession();
      return null;
    }
    
    // For worker sessions (identified by worker_token_ prefix), skip validation
    // Workers don't use Supabase auth tokens, so validation would fail
    if (session.accessToken.startsWith('worker_token_')) {
      console.log('[SessionService] Worker session detected, skipping token validation');
      console.log('[SessionService] Worker session is valid');
      this.startSessionValidation();
      return session;
    }
    
    // For Supabase sessions, validate the token (with fallback)
    console.log('[SessionService] Validating Supabase session...');
    try {
      const isValid = await this.validateSession(session.accessToken);
      
      if (!isValid) {
        console.log('[SessionService] Session validation failed');
        return null;
      }
    } catch (error) {
      console.warn('[SessionService] Session validation threw error, checking expiration locally:', error);
      // Even if validation fails, keep the session if it's not expired
      const secondsUntilExpiry = session.expiresAt - now;
      if (secondsUntilExpiry <= 0) {
        console.log('[SessionService] Session has expired, invalidating');
        await this.invalidateSession();
        return null;
      }
      console.log('[SessionService] Session is still valid (not expired), continuing with session');
    }

    // Start validation loop
    this.startSessionValidation();

    console.log('[SessionService] Session initialized successfully');
    return session;
  }

  /**
   * Ensure the Supabase SDK holds a valid authenticated session before a
   * request restricted by RLS to the "authenticated" role (storage uploads,
   * etc.). With persistSession/autoRefreshToken disabled, the SDK can lose its
   * in-memory session (page refresh, expired token) and silently fall back to
   * the anon key — RLS then rejects the request with
   * "new row violates row-level security policy".
   * Returns true if an authenticated session is active after this call.
   */
  async ensureSupabaseSession(): Promise<boolean> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const { data: { session: sdkSession } } = await supabase.auth.getSession();
      if (sdkSession && (sdkSession.expires_at || 0) > now + 30) {
        return true;
      }

      // Read localStorage directly (not getCurrentSession) so an expired
      // access token doesn't get purged before we can use its refresh token.
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        console.warn('[SessionService] ensureSupabaseSession: no stored session');
        return false;
      }

      const stored: SessionData = JSON.parse(raw);
      if (stored.accessToken.startsWith('worker_token_')) {
        // Worker sessions have no Supabase auth token
        console.warn('[SessionService] ensureSupabaseSession: worker session cannot authenticate with Supabase');
        return false;
      }

      // setSession auto-refreshes with the refresh token if the access token expired
      const { data, error } = await supabase.auth.setSession({
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken || ''
      });

      if (error || !data.session) {
        console.warn('[SessionService] ensureSupabaseSession: setSession failed:', error?.message);

        // Fallback: try refreshSession directly with the refresh token.
        // setSession can reject an expired JWT even when the refresh token
        // is still valid — refreshSession handles this case correctly.
        if (stored.refreshToken) {
          console.log('[SessionService] ensureSupabaseSession: trying refreshSession fallback…');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: stored.refreshToken
          });

          if (refreshError || !refreshData.session) {
            console.warn('[SessionService] ensureSupabaseSession: refreshSession also failed:', refreshError?.message);
            return false;
          }

          // Persist the new tokens
          await this.createSession(
            refreshData.session.access_token,
            refreshData.session.refresh_token || stored.refreshToken,
            refreshData.session.expires_at || stored.expiresAt,
            stored.userId,
            stored.email,
            stored.role,
            stored.name
          );

          console.log('[SessionService] ensureSupabaseSession: session restored via refreshSession');
          return true;
        }

        return false;
      }

      // Persist rotated tokens so the next restore keeps working
      if (data.session.access_token !== stored.accessToken) {
        await this.createSession(
          data.session.access_token,
          data.session.refresh_token || stored.refreshToken,
          data.session.expires_at || stored.expiresAt,
          stored.userId,
          stored.email,
          stored.role,
          stored.name
        );
      }

      console.log('[SessionService] ensureSupabaseSession: session restored');
      return true;
    } catch (error) {
      console.warn('[SessionService] ensureSupabaseSession error:', error);
      return false;
    }
  }

  /**
   * Get auth headers for requests
   */
  getAuthHeaders(): Record<string, string> {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    try {
      const session: SessionData = JSON.parse(stored);
      return {
        'Authorization': `Bearer ${session.accessToken}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXFteGlxZWVnY252b3BpYnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTg1MjIsImV4cCI6MjA4ODQ3NDUyMn0.7-6qvX4F3oebYm-W1bBl6SsKQf-A79bc1PP7PhpQYcQ'
      };
    } catch {
      return {};
    }
  }
}

export const sessionService = new SessionService();
