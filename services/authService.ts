
import { User } from '../types';
import { supabase } from './supabase';

export const authService = {
  // Login with Email and Password
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(mapSupabaseError(error.message));
    }

    if (!data.user) {
      throw new Error("登录失败，未返回用户信息");
    }

    return mapSupabaseUser(data.user);
  },

  // Register with Email, Password, and Username (stored in metadata)
  register: async (email: string, password: string, username: string): Promise<User> => {
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
    await supabase.auth.signOut();
  },

  // Get current session user
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return mapSupabaseUser(session.user);
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
