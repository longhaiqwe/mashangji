
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// TODO: 请替换为你自己的 Supabase 项目 URL 和 Anon Key
// 你可以在 Supabase Dashboard -> Project Settings -> API 中找到这些信息

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Enable URL detection on Web so OAuth redirects work.
    // Disable on Native to prevent hash routing conflicts (unless native handling is added).
    detectSessionInUrl: !Capacitor.isNativePlatform()
  }
});
