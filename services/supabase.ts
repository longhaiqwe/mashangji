
import { createClient } from '@supabase/supabase-js';

// TODO: 请替换为你自己的 Supabase 项目 URL 和 Anon Key
// 你可以在 Supabase Dashboard -> Project Settings -> API 中找到这些信息

const SUPABASE_URL = 'https://xdvdxbjdtkzmyoqrgdmm.supabase.co';

// 注意：Anon Key 通常是以 "eyJ" 开头的很长的字符串
// 请去 Supabase 后台 -> Project Settings -> API -> Project API keys -> anon public 复制
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdmR4YmpkdGt6bXlvcXJnZG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc1MjcsImV4cCI6MjA4MTA5MzUyN30.h8YfLhg-X4wapnUljK3DsrRiOQc6CqDrdQ3C3uXTlx0'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
