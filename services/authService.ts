
import { User } from '../types';
import { supabase } from './supabase';
import { deleteAllRecords, deleteAllCircles, deleteAllPreferences } from './storageService';

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
        console.error('[AuthService] Login error:', JSON.stringify(error, null, 2));

        // Handle "AuthRetryableFetchError" specifically (often network/CORS related in hybrid apps)
        if (error.name === 'AuthRetryableFetchError' || (error as any).isRetryable) {
          throw new Error("网络连接失败，请检查您的网络设置（AuthRetryableFetchError）");
        }

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

  // Apple Sign In
  loginWithApple: async (): Promise<User> => {
    // Proactively clear stale session
    clearLocalSession();
    try {
      const { Capacitor } = await import('@capacitor/core');

      // WEB SPECIFIC LOGIC: Use standard Supabase OAuth
      if (!Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: window.location.origin // Automatically returns to the current page after login
          }
        });

        if (error) throw error;
        // Note: signInWithOAuth redirects the page, so code below here won't execute immediately.
        // The App.tsx onAuthStateChange listener will handle the successful login state upon return.
        return {} as User; // Caller expects a User, return empty as placeholder while redirecting
      }

      // NATIVE LOGIC: Use Capacitor Plugin
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');

      const result = await SignInWithApple.authorize({
        clientId: 'io.supabase.mashangji.service',
        scopes: 'email name',
        redirectURI: 'https://xdvdxbjdtkzmyoqrgdmm.supabase.co/auth/v1/callback',
      });

      if (result.response && result.response.identityToken) {
        console.log('[AuthService] Apple Identity Token received. Aud:', result.response.identityToken.split('.')[1] ? JSON.parse(atob(result.response.identityToken.split('.')[1])).aud : 'unknown');

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
          // nonce: 'nonce', // Removed to prevent mismatch issues
        });

        if (error) {
          console.error('[AuthService] Supabase signInWithIdToken error:', JSON.stringify(error, null, 2));
          throw new Error(mapSupabaseError(error.message));
        }
        if (!data.user) throw new Error("Apple 登录失败，未返回用户信息");

        return mapSupabaseUser(data.user);
      } else {
        throw new Error("Apple 登录未返回有效 Token");
      }
    } catch (error: any) {
      console.error('[AuthService] Apple Login error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error?.message?.includes('canceled')) {
        throw new Error('用户取消登录');
      }
      throw new Error("Apple 登录失败: " + (error.message || '未知错误'));
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
          setTimeout(() => reject(new Error('Session check timeout')), 20000)
        )
      ]);

      if (error || !session?.user) return null;
      return mapSupabaseUser(session.user);
    } catch (e) {
      console.warn("Get session timeout or error:", e);
      return null;
    }
  },

  // Delete account (Delete data -> Sign out)
  deleteAccount: async (userId: string): Promise<void> => {
    try {
      console.log('[AuthService] Deleting account data for:', userId);
      // 1. Delete all user data
      await Promise.all([
        deleteAllRecords(userId),
        deleteAllCircles(userId),
        deleteAllPreferences(userId)
      ]);

      console.log('[AuthService] Data deleted. Attempting to delete Auth user via RPC...');

      // 2. Try to delete the Auth user via RPC
      // The updated SQL function returns the deleted user ID as a string
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user');

      if (rpcError) {
        console.error('[AuthService] RPC delete_user FAILED:', rpcError);
        console.warn('Falling back to local sign out. User data is gone, but Auth account remains.');
        alert(`注销账号部分失败: 您的数据已清空，但账号本身未被服务器删除 (RPC Error: ${rpcError.message})。请联系开发者。`);
      } else if (!rpcData) {
        console.warn('[AuthService] RPC delete_user returned no data (User maybe already deleted?)');
      } else {
        console.log('[AuthService] Auth user deleted successfully. Deleted ID:', rpcData);
      }

      // 3. Sign out (Always do this to clear local session)
      await authService.logout();

    } catch (error) {
      console.error('[AuthService] Delete account error:', error);
      throw new Error("注销账号失败，请重试或联系客服");
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
