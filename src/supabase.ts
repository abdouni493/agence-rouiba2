import { createClient } from '@supabase/supabase-js'

// default values from the shared Supabase project (used when env vars aren't supplied)
const DEFAULT_SUPABASE_URL = 'https://jrgejskwlvmkpefrassc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2Vqc2t3bHZta3BlZnJhc3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTI1NzEsImV4cCI6MjA5OTM2ODU3MX0.wM46svYVYUsybOa770Q1btLhB7I9XTV9VkVygyl2ojw';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

// Do not export from inside block scope. Create a top-level holder and
// assign a real client or a mock implementation depending on env vars.
let _supabase: any = null

if (!supabaseUrl || !supabaseAnonKey) {
  const missingMsg = 'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  console.error(missingMsg)

  const errorResult = { data: null, error: new Error(missingMsg) }

  // Creates a chainable proxy object that returns itself for any property or
  // call. When the object is awaited (via then), it resolves to errorResult.
  const createErrorProxy = () => {
    const handler: ProxyHandler<any> = {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: any) => resolve(errorResult)
        }
        return proxy
      },
      apply() {
        return proxy
      }
    }
    const proxy: any = new Proxy(function () {}, handler)
    return proxy
  }

  const mockSupabase: any = createErrorProxy()
  // auth stub: several methods return errorResult or dummy structures but won't crash
  mockSupabase.auth = {
    onAuthStateChange: (_callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signIn: async () => errorResult,
    signUp: async () => errorResult,
    signInWithPassword: async () => errorResult,
    signOut: async () => ({ error: new Error(missingMsg) }),
    getSession: async () => ({ data: null, error: new Error(missingMsg) }),
    // provide a proxy for any other access to avoid undefined errors
    ...createErrorProxy(),
  }
  mockSupabase.from = () => createErrorProxy()
  mockSupabase.storage = { from: () => createErrorProxy() }

  _supabase = mockSupabase
} else {
  console.log('[Supabase] === CLIENT INITIALIZATION ===');
  console.log('[Supabase] URL:', supabaseUrl.substring(0, 50) + '...');
  console.log('[Supabase] Disabling SDK session management to prevent 429 rate limits');
  
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,  // Disable SDK session persistence - we manage it manually
      autoRefreshToken: false, // Prevent automatic refresh to avoid 429 rate limits
      detectSessionInUrl: false, // Don't auto-detect sessions
      flowType: 'pkce',
      storage: localStorage
    }
  })
  
  console.log('[Supabase] === CLIENT READY ===\n');
}

export const supabase = _supabase

// indicate whether valid configuration was provided so UI can react accordingly
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Database types (you can generate these from your Supabase schema)
export type Database = {
  public: {
    Tables: {
      // track basic profile information linked to auth.users
      profiles: {
        Row: {
          id: string;
          username: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          username?: string;
          role?: string;
          created_at?: string;
        };
      };

      // simple view for counting administrators (used by login page logic)
      admin_count: {
        Row: {
          count: number;
        };
        Insert: {
          count: number;
        };
        Update: {
          count?: number;
        };
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}