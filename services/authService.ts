
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
  loginWithApple: async (): Promise<User | null> => {
    // Proactively clear stale session
    clearLocalSession();
    try {
      const { Capacitor } = await import('@capacitor/core');

      // WEB or ANDROID SPECIFIC LOGIC: Use standard Supabase OAuth
      // Android native "SignInWithApple" plugin often requires complex setup or just wraps the web flow.
      // For simplicity and compatibility, we use the Web flow for Android too.
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: window.location.origin, // Automatically returns to the current page after login
            skipBrowserRedirect: true // Get the auth URL directly to skip Supabase loading screens
          }
        });

        if (error) throw error;

        // Manually redirect to the Apple Auth URL (Browser or Webview)
        if (data?.url) {
          window.location.href = data.url;
        }

        return null; // Return null to indicate redirecting
      }

      // IOS NATIVE LOGIC: Use Capacitor Plugin with auto-retry
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');

      // Helper function to attempt Apple Sign In with retry logic
      // iOS sometimes fails on first attempt due to system services not being fully initialized
      const attemptAppleSignIn = async (retryCount = 0, maxRetries = 2): Promise<any> => {
        try {
          return await SignInWithApple.authorize({
            clientId: 'io.supabase.mashangji.service',
            scopes: 'email name',
            redirectURI: 'https://xdvdxbjdtkzmyoqrgdmm.supabase.co/auth/v1/callback',
          });
        } catch (error: any) {
          const errorMessage = error?.message || error?.errorMessage || '';

          // Check if this is a system initialization error (error 1000) that's worth retrying
          // Do NOT retry if user explicitly canceled (error 1001 or contains "canceled")
          const isSystemError = errorMessage.includes('error 1000') ||
            errorMessage.includes('AuthorizationError Code=1000');
          const isUserCanceled = errorMessage.includes('error 1001') ||
            errorMessage.toLowerCase().includes('canceled') ||
            errorMessage.toLowerCase().includes('cancelled');

          if (isSystemError && !isUserCanceled && retryCount < maxRetries) {
            console.log(`[AuthService] Apple Sign In failed with system error, retrying (${retryCount + 1}/${maxRetries})...`);
            // Wait before retry to give iOS time to initialize services
            await new Promise(resolve => setTimeout(resolve, 500));
            return attemptAppleSignIn(retryCount + 1, maxRetries);
          }

          throw error; // Re-throw if not retryable or max retries exceeded
        }
      };

      const result = await attemptAppleSignIn();

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

        // Apple 只在首次授权时提供用户名，必须立即保存到 user_metadata
        // 否则后续 token 刷新时名字会丢失
        const givenName = result.response.givenName;
        const familyName = result.response.familyName;
        let userToReturn = data.user;

        if (givenName || familyName) {
          const fullName = [givenName, familyName].filter(Boolean).join(' ');
          console.log('[AuthService] Saving Apple user name to metadata:', fullName);
          try {
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                given_name: givenName,
                family_name: familyName,
              }
            });

            if (updateError) {
              console.warn('[AuthService] Failed to update user metadata:', updateError);
              // 即使 updateUser 失败，也手动添加名字到本地 user 对象
              userToReturn = {
                ...data.user,
                user_metadata: {
                  ...data.user.user_metadata,
                  full_name: fullName,
                  given_name: givenName,
                  family_name: familyName,
                }
              };
            } else if (updateData?.user) {
              console.log('[AuthService] User metadata updated successfully');
              userToReturn = updateData.user;
            }
          } catch (updateError) {
            console.warn('[AuthService] Exception saving user name:', updateError);
            // 手动添加名字到本地 user 对象
            userToReturn = {
              ...data.user,
              user_metadata: {
                ...data.user.user_metadata,
                full_name: fullName,
                given_name: givenName,
                family_name: familyName,
              }
            };
          }
        }

        return mapSupabaseUser(userToReturn);
      } else {
        throw new Error("Apple 登录未返回有效 Token");
      }
    } catch (error: any) {
      console.error('[AuthService] Apple Login error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error?.message?.includes('canceled') || error?.message?.includes('1001')) {
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
      // Race signOut against a short timeout (e.g., 500ms)
      // We don't want the user to wait if the server is slow/unreachable
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 500))
      ]);

      clearLocalSession();
      console.log('[AuthService] Sign out complete (or timed out)');
    } catch (error) {
      console.error('[AuthService] Sign out error:', error);
      // Suppress error and force clear ensuring UI can still transition
      clearLocalSession();
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
  },

  // Update user profile
  updateProfile: async (updates: { username?: string; avatar_url?: string }): Promise<User> => {
    // Helper to perform the actual update call
    const performUpdate = async () => {
      const data: any = {};
      if (updates.username) {
        data.username = updates.username;
        data.full_name = updates.username; // Sync all name fields
        data.name = updates.username;
        data.preferred_username = updates.username;
      }
      if (updates.avatar_url) {
        data.avatar_url = updates.avatar_url;
      }
      return await supabase.auth.updateUser({ data });
    };

    const persistLocally = (userId: string, username: string) => {
      try {
        const key = `custom_profile_${userId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        const updated = { ...existing, username, updatedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(updated));
        console.log('[AuthService] User profile saved locally as fallback');
      } catch (e) {
        console.warn('[AuthService] Failed to save local profile:', e);
      }
    };

    const attemptUpdate = async (retryCount = 0): Promise<User> => {
      let currentSession = null;
      try {
        const { data } = await supabase.auth.getSession();
        currentSession = data.session;
      } catch (e) { }

      // If no session locally, we can't do much
      if (!currentSession?.user) throw new Error('未登录，无法修改资料');

      try {
        // 1. Ensure session is fresh before writing
        if (retryCount === 0) {
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) console.warn('[AuthService] Pre-update session check failed:', sessionError);
        }

        // 2. Perform Update
        const { data: userData, error } = await performUpdate();

        if (error) {
          console.error(`[AuthService] Update profile error (attempt ${retryCount + 1}):`, error);

          // CRITICAL: VERIFY RESULT BEFORE RETRYING
          // Sometimes the server successfully engages the change, but the response is lost/timed out (status 0).
          // We check the server state directly. If the name matches, we declare victory.
          if (updates.username) {
            try {
              const { data: freshData } = await supabase.auth.getUser();
              if (freshData?.user) {
                // Map the fresh user to get the resolved username (handles metadata priority)
                const freshAppUser = mapSupabaseUser(freshData.user);
                if (freshAppUser.username === updates.username) {
                  console.log('[AuthService] Update reported error but verification confirmed SUCCESS. Ignoring error.');

                  // Update local fallback to match
                  persistLocally(freshData.user.id, updates.username);
                  return freshAppUser;
                }
              }
            } catch (validationError) {
              console.warn('[AuthService] Verification check failed:', validationError);
            }
          }

          // Check for retryable error
          const isRetryable =
            error.name === 'AuthRetryableFetchError' ||
            (error as any).isRetryable ||
            error.status === 0 ||
            error.message.includes('fetch') ||
            error.message.includes('Load failed');

          if (isRetryable && retryCount < 2) { // Reduce retries to 2 for faster fallback
            console.log(`[AuthService] Update profile failed with retryable error. Retrying (${retryCount + 1}/2)...`);
            await new Promise(resolve => setTimeout(resolve, 800));
            return attemptUpdate(retryCount + 1);
          }

          // If we reached here, cloud update failed definitively.
          // FALLBACK: Save locally
          if (updates.username) {
            console.log('[AuthService] Cloud update failed, falling back to local storage');
            persistLocally(currentSession.user.id, updates.username);

            // Construct a "fake" successful user object
            const localUser = mapSupabaseUser(currentSession.user);
            localUser.username = updates.username;
            return localUser;
          }

          throw new Error(mapSupabaseError(error.message));
        }

        if (!userData.user) {
          throw new Error('更新失败，未返回用户信息');
        }

        // 3. Success! Also update local fallback cache to keep it in sync
        if (updates.username) {
          persistLocally(userData.user.id, updates.username);
        }

        return mapSupabaseUser(userData.user);

      } catch (error: any) {
        // Catch network exceptions
        const isRetryable = error.message?.includes('fetch') || error.name === 'AuthRetryableFetchError';

        if (isRetryable && retryCount < 2) {
          console.log(`[AuthService] Update profile exception. Retrying (${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 800));
          return attemptUpdate(retryCount + 1);
        }

        // FALLBACK on Exception
        if (updates.username && currentSession?.user) {
          console.log('[AuthService] Exception caught, falling back to local storage');
          persistLocally(currentSession.user.id, updates.username);
          const localUser = mapSupabaseUser(currentSession.user);
          localUser.username = updates.username;
          return localUser;
        }

        console.error('[AuthService] Update profile exception:', error);
        throw error;
      }
    };

    return attemptUpdate();
  }
};

// Helper to transform Supabase user to App user
const mapSupabaseUser = (sbUser: any): User => {
  const metadata = sbUser.user_metadata || {};
  // Prioritize Apple ID's 'full_name' or 'name', then explicit 'username', then 'preferred_username'
  let displayName = metadata.full_name || metadata.name || metadata.username || metadata.preferred_username;

  // CHECK LOCAL OVERRIDE
  if (typeof window !== 'undefined' && window.localStorage && sbUser.id) {
    try {
      const localData = JSON.parse(localStorage.getItem(`custom_profile_${sbUser.id}`) || 'null');
      if (localData && localData.username) {
        displayName = localData.username;
      }
    } catch (e) {
      // ignore json parse error
    }
  }

  return {
    id: sbUser.id,
    // use found name, or fallback to email prefix, or default to '用户'
    username: displayName || sbUser.email?.split('@')[0] || '用户',
    avatar: metadata.avatar_url
  };
};

// Helper to translate common Supabase errors to Chinese
const mapSupabaseError = (msg: string): string => {
  if (msg.includes("Invalid login credentials")) return "邮箱或密码错误";
  if (msg.includes("User already registered")) return "该邮箱已被注册";
  if (msg.includes("Password should be at least")) return "密码长度不足";
  return "操作失败: " + msg;
};
