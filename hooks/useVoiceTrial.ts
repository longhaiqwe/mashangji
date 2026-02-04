import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { VOICE_TRIAL_LIMIT, VOICE_TRIAL_STORAGE_KEY, PRO_DAILY_VOICE_LIMIT, PRO_DAILY_VOICE_STORAGE_KEY } from '../constants';
import { useSubscription } from '../context/SubscriptionContext';

export interface UseVoiceTrialResult {
    trialUsed: number;       // 已使用次数（非Pro：累计；Pro：今日）
    trialLimit: number;      // 限制上限 (10)
    remaining: number;       // 剩余次数
    canUseVoice: boolean;    // 是否可使用
    isPro: boolean;          // 是否为Pro用户
    incrementUsage: () => Promise<void>;  // 增加使用次数
    loading: boolean;
}

// 获取当前日期字符串（YYYY-MM-DD，使用本地时区）
const getTodayDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Pro 每日缓存数据结构
interface ProDailyCache {
    count: number;
    date: string;
}

export const useVoiceTrial = (): UseVoiceTrialResult => {
    const { isPro, loading: subscriptionLoading } = useSubscription();

    // 非 Pro 用户：累计试用次数
    const [trialUsed, setTrialUsed] = useState<number>(() => {
        try {
            const cached = localStorage.getItem(VOICE_TRIAL_STORAGE_KEY);
            return cached ? parseInt(cached, 10) : 0;
        } catch {
            return 0;
        }
    });

    // Pro 用户：每日使用次数
    const [proDailyUsed, setProDailyUsed] = useState<number>(() => {
        try {
            const cached = localStorage.getItem(PRO_DAILY_VOICE_STORAGE_KEY);
            if (cached) {
                const data: ProDailyCache = JSON.parse(cached);
                // 检查是否为今天的数据
                if (data.date === getTodayDateString()) {
                    return data.count;
                }
            }
            return 0;
        } catch {
            return 0;
        }
    });

    const [trialLoading, setTrialLoading] = useState<boolean>(true);

    // 保存非 Pro 试用次数到 localStorage
    const saveTrialToCache = useCallback((value: number) => {
        try {
            localStorage.setItem(VOICE_TRIAL_STORAGE_KEY, value.toString());
        } catch (e) {
            console.error('Failed to save voice trial to cache:', e);
        }
    }, []);

    // 保存 Pro 每日次数到 localStorage
    const saveProDailyToCache = useCallback((count: number, date: string) => {
        try {
            const data: ProDailyCache = { count, date };
            localStorage.setItem(PRO_DAILY_VOICE_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save pro daily voice to cache:', e);
        }
    }, []);

    // 从 Supabase 加载用户数据
    const loadFromSupabase = useCallback(async (): Promise<{
        trialUsed: number | null;
        proDailyCount: number | null;
        proDailyDate: string | null;
    }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { trialUsed: null, proDailyCount: null, proDailyDate: null };

            const { data, error } = await supabase
                .from('user_preferences')
                .select('voice_trial_used, pro_daily_voice_count, pro_daily_voice_date')
                .eq('user_id', user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return { trialUsed: 0, proDailyCount: 0, proDailyDate: null };
                }
                console.error('Error loading voice data from Supabase:', error);
                return { trialUsed: null, proDailyCount: null, proDailyDate: null };
            }

            return {
                trialUsed: data?.voice_trial_used ?? 0,
                proDailyCount: data?.pro_daily_voice_count ?? 0,
                proDailyDate: data?.pro_daily_voice_date ?? null,
            };
        } catch (e) {
            console.error('Failed to load voice data from Supabase:', e);
            return { trialUsed: null, proDailyCount: null, proDailyDate: null };
        }
    }, []);

    // 同步非 Pro 试用次数到 Supabase
    const syncTrialToSupabase = useCallback(async (value: number): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { error } = await supabase
                .from('user_preferences')
                .upsert(
                    { user_id: user.id, voice_trial_used: value },
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error('Error syncing voice trial to Supabase:', error);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to sync voice trial to Supabase:', e);
            return false;
        }
    }, []);

    // 同步 Pro 每日次数到 Supabase
    const syncProDailyToSupabase = useCallback(async (count: number, date: string): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { error } = await supabase
                .from('user_preferences')
                .upsert(
                    { user_id: user.id, pro_daily_voice_count: count, pro_daily_voice_date: date },
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error('Error syncing pro daily voice to Supabase:', error);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to sync pro daily voice to Supabase:', e);
            return false;
        }
    }, []);

    // 初始化：加载数据
    useEffect(() => {
        const init = async () => {
            setTrialLoading(true);

            const serverData = await loadFromSupabase();

            // 非 Pro 用户：同步累计试用次数
            if (serverData.trialUsed !== null) {
                const cachedTrial = trialUsed;
                const finalTrial = Math.max(cachedTrial, serverData.trialUsed);
                setTrialUsed(finalTrial);
                saveTrialToCache(finalTrial);
            }

            // Pro 用户：同步每日使用次数
            const today = getTodayDateString();
            if (serverData.proDailyDate === today && serverData.proDailyCount !== null) {
                // 今天的数据，取服务器和本地的最大值
                const finalProDaily = Math.max(proDailyUsed, serverData.proDailyCount);
                setProDailyUsed(finalProDaily);
                saveProDailyToCache(finalProDaily, today);
            } else if (serverData.proDailyDate !== today) {
                // 不是今天的数据，重置为 0
                setProDailyUsed(0);
                saveProDailyToCache(0, today);
            }

            setTrialLoading(false);
        };

        init();
    }, [loadFromSupabase, saveTrialToCache, saveProDailyToCache]);

    // 增加使用次数
    const incrementUsage = useCallback(async (): Promise<void> => {
        const today = getTodayDateString();

        if (isPro) {
            // Pro 用户：增加每日使用次数
            const newCount = proDailyUsed + 1;
            setProDailyUsed(newCount);
            saveProDailyToCache(newCount, today);
            syncProDailyToSupabase(newCount, today);
        } else {
            // 非 Pro 用户：增加累计试用次数
            const newValue = trialUsed + 1;
            setTrialUsed(newValue);
            saveTrialToCache(newValue);
            syncTrialToSupabase(newValue);
        }
    }, [isPro, proDailyUsed, trialUsed, saveProDailyToCache, saveTrialToCache, syncProDailyToSupabase, syncTrialToSupabase]);

    // 计算剩余次数和是否可用
    const remaining = isPro
        ? Math.max(0, PRO_DAILY_VOICE_LIMIT - proDailyUsed)
        : Math.max(0, VOICE_TRIAL_LIMIT - trialUsed);

    const canUseVoice = isPro
        ? proDailyUsed < PRO_DAILY_VOICE_LIMIT
        : trialUsed < VOICE_TRIAL_LIMIT;

    const loading = subscriptionLoading || trialLoading;

    return {
        trialUsed: isPro ? proDailyUsed : trialUsed,
        trialLimit: isPro ? PRO_DAILY_VOICE_LIMIT : VOICE_TRIAL_LIMIT,
        remaining,
        canUseVoice,
        isPro,
        incrementUsage,
        loading,
    };
};

