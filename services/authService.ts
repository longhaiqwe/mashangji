
import { User } from '../types';
import { supabase } from './supabase';

const clearLocalSession = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('sb-')) {
        window.localStorage.removeItem(key);
        console.log('[AuthService] Cleared stale token:', key);
      }
    });
  }
};

export const authService = {
  // Login with Email and Password
  login: async (email: string, password: string): Promise<User> => {
    console.log('[AuthService] Attempting login for:', email);

    // Proactively clear any stale session data before starting a new login.
    // This prevents "zombie" tokens from interfering with the new request.
    clearLocalSession();

    // CRITICAL FIX: Force the Supabase client to clear its *in-memory* state.
    // Even if we delete the localStorage file, the client might have already loaded
    // the stale token into RAM on page load. Calling signOut() resets it.
    // We swallow errors and timeout quickly because we don't care about server ack,
    // we just want the local client to stop "thinking" it's logged in.
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 300))
      ]);
    } catch (e) {
      // Ignore signOut errors
    }

    try {
      // Add 15s timeout to prevent infinite hanging
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('请求超时，请检查网络或刷新页面重试')), 15000)
        )
      ]);

      if (error) {
        console.error('[AuthService] Login error:', error);
        throw new Error(mapSupabaseError(error.message));
      }

      if (!data.user) {
        console.error('[AuthService] No user returned');
        throw new Error("登录失败，未返回用户信息");
      }

      console.log('[AuthService] Login successful user:', data.user.id);
      return mapSupabaseUser(data.user);
    } catch (err: any) {
      console.error('[AuthService] Login exception:', err);
      throw err;
    }
  },

  // Register with Email, Password, and Username (stored in metadata)
  register: async (email: string, password: string, username: string): Promise<User> => {
    // Also clear session before register to be safe
    clearLocalSession();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username, // Save username to user_metadata
        },
      },
    });

    if (error) {
      throw new Error(mapSupabaseError(error.message));
    }

    if (!data.user) {
      throw new Error("注册失败，可能需要确认邮箱验证");
    }

    return mapSupabaseUser(data.user);
  },

  logout: async (): Promise<void> => {
    try {
      console.log('[AuthService] Signing out...');
      await supabase.auth.signOut();
      clearLocalSession();
      console.log('[AuthService] Sign out complete');
    } catch (error) {
      console.error('[AuthService] Sign out error:', error);
      // Suppress error to ensure UI can still transition to login screen
    }
  },

  // Get current session user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { session }, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: any }, error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        )
      ]);

      if (error || !session?.user) return null;
      return mapSupabaseUser(session.user);
    } catch (e) {
      console.warn("Get session timeout or error:", e);
      return null;
    }
  }
};

// Helper to transform Supabase user to App user
const mapSupabaseUser = (sbUser: any): User => {
  return {
    id: sbUser.id,
    // Use metadata username if available, otherwise fallback to email prefix
    username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'User',
    avatar: sbUser.user_metadata?.avatar_url
  };
};

// Helper to translate common Supabase errors to Chinese
const mapSupabaseError = (msg: string): string => {
  if (msg.includes("Invalid login credentials")) return "邮箱或密码错误";
  if (msg.includes("User already registered")) return "该邮箱已被注册";
  if (msg.includes("Password should be at least")) return "密码长度不足";
  return "操作失败: " + msg;
};
