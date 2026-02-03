import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { VOICE_TRIAL_LIMIT, VOICE_TRIAL_STORAGE_KEY } from '../constants';

export interface UseVoiceTrialResult {
    trialUsed: number;       // 已使用次数
    trialLimit: number;      // 试用上限 (10)
    remaining: number;       // 剩余次数
    canUseVoice: boolean;    // 是否可使用
    isPro: boolean;          // 是否为Pro用户（预留）
    incrementUsage: () => Promise<void>;  // 增加使用次数
    loading: boolean;
}

export const useVoiceTrial = (): UseVoiceTrialResult => {
    const [trialUsed, setTrialUsed] = useState<number>(0);
    const [isPro, setIsPro] = useState<boolean>(false); // 预留Pro状态
    const [loading, setLoading] = useState<boolean>(true);

    // 从 localStorage 加载缓存
    const loadFromCache = useCallback((): number => {
        try {
            const cached = localStorage.getItem(VOICE_TRIAL_STORAGE_KEY);
            return cached ? parseInt(cached, 10) : 0;
        } catch {
            return 0;
        }
    }, []);

    // 保存到 localStorage 缓存
    const saveToCache = useCallback((value: number) => {
        try {
            localStorage.setItem(VOICE_TRIAL_STORAGE_KEY, value.toString());
        } catch (e) {
            console.error('Failed to save voice trial to cache:', e);
        }
    }, []);

    // 从 Supabase 加载用户试用数据
    const loadFromSupabase = useCallback(async (): Promise<number | null> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('user_preferences')
                .select('voice_trial_used')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // 如果记录不存在，可能需要创建
                if (error.code === 'PGRST116') {
                    return 0;
                }
                console.error('Error loading voice trial from Supabase:', error);
                return null;
            }

            return data?.voice_trial_used ?? 0;
        } catch (e) {
            console.error('Failed to load voice trial from Supabase:', e);
            return null;
        }
    }, []);

    // 同步到 Supabase
    const syncToSupabase = useCallback(async (value: number): Promise<boolean> => {
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

    // 初始化：加载数据
    useEffect(() => {
        const init = async () => {
            setLoading(true);

            // 先从缓存加载（快速响应）
            const cached = loadFromCache();
            setTrialUsed(cached);

            // 然后从 Supabase 加载（准确数据）
            const serverValue = await loadFromSupabase();
            if (serverValue !== null) {
                // 使用服务器上更大的值（防止用户清除缓存绕过限制）
                const finalValue = Math.max(cached, serverValue);
                setTrialUsed(finalValue);
                saveToCache(finalValue);
            }

            setLoading(false);
        };

        init();
    }, [loadFromCache, loadFromSupabase, saveToCache]);

    // 增加使用次数
    const incrementUsage = useCallback(async (): Promise<void> => {
        const newValue = trialUsed + 1;
        setTrialUsed(newValue);
        saveToCache(newValue);

        // 异步同步到服务器
        syncToSupabase(newValue);
    }, [trialUsed, saveToCache, syncToSupabase]);

    const remaining = Math.max(0, VOICE_TRIAL_LIMIT - trialUsed);
    const canUseVoice = isPro || trialUsed < VOICE_TRIAL_LIMIT;

    return {
        trialUsed,
        trialLimit: VOICE_TRIAL_LIMIT,
        remaining,
        canUseVoice,
        isPro,
        incrementUsage,
        loading,
    };
};
