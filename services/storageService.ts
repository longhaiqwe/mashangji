
import { Record, Circle, UserPreferences } from '../types';
import { DEFAULT_CIRCLES, DEFAULT_PREFERENCES } from '../constants';
import { supabase } from './supabase';

/**
 * Helper to execute DB operations with auto-retry and session refresh
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await operation();
  } catch (err: any) {
    if (retries > 0) {
      // Check for likely Auth/Network errors
      // 401: Unauthorized (JWT expired/invalid)
      // 403: Forbidden (RLS policy, but sometimes requires refresh)
      // "JWT expired" message
      // Network errors (TypeError: Failed to fetch)
      const message = (err?.message || '').toString();
      const lowerMessage = message.toLowerCase();
      const code = err?.code;
      const isAuthError =
        err?.status === 401 ||
        err?.status === 403 ||
        code === 'PGRST301' || // JWT expired
        message.includes('JWT') ||
        message.includes('jwt') ||
        lowerMessage.includes('auth session missing') ||
        lowerMessage.includes('invalid jwt');
      const isNetworkError =
        err?.status === 0 ||
        err?.name === 'AuthRetryableFetchError' ||
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('connection');

      if (isAuthError) {
        console.warn('[Storage] Auth error detected, attempting session refresh...', err);
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[Storage] Session refresh failed:', error);
          // Don't return here, let the next retry (or final throw) handle it, 
          // but effectively we can't fix it if refresh fails.
        } else if (data.session) {
          console.log('[Storage] Session refreshed successfully.');
        }
      } else if (isNetworkError) {
        console.warn('[Storage] Network error, retrying in 1s...', err);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        // Unknown error, maybe just retry once?
        console.warn('[Storage] Operation failed, retrying...', err);
      }

      return withRetry(operation, retries - 1);
    }
    throw err;
  }
}


// --- Records ---

type FetchOptions = { throwOnError?: boolean };

export const fetchRecords = async (userId: string, options?: FetchOptions): Promise<Record[]> => {
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data;
    });

    const rows = data || [];
    // Map snake_case DB columns to camelCase TS interface
    return rows.map((item: any) => ({
      id: item.id,
      circleId: item.circle_id,
      amount: Number(item.amount),
      date: item.date,
      note: item.note,
      timestamp: Number(item.timestamp),
    }));
  } catch (err) {
    console.error('Error fetching records:', err);
    if (options?.throwOnError) throw err;
    return [];
  }
};

export const addRecord = async (record: Record, userId: string): Promise<Record | null> => {
  const dbRecord = {
    id: record.id,
    user_id: userId,
    circle_id: record.circleId,
    amount: record.amount,
    date: record.date,
    note: record.note,
    timestamp: record.timestamp,
  };

  return withRetry(async () => {
    const { error } = await supabase.from('records').insert(dbRecord);
    if (error) throw error;
    return record;
  }).catch(error => {
    console.error('Error adding record:', error);
    throw error;
  });
  return record;
};

export const addRecordsBatch = async (records: Record[], userId: string): Promise<void> => {
  if (records.length === 0) return;

  const dbRecords = records.map(record => ({
    id: record.id,
    user_id: userId,
    circle_id: record.circleId,
    amount: record.amount,
    date: record.date,
    note: record.note,
    timestamp: record.timestamp,
  }));

  await withRetry(async () => {
    const { error } = await supabase.from('records').upsert(dbRecords, {
      onConflict: 'id',
      ignoreDuplicates: true
    });
    if (error) throw error;
  }).catch(error => {
    console.error('Error adding batch records:', error);
    throw error;
  });
};

export const updateRecord = async (record: Record, userId: string): Promise<void> => {
  const dbRecord = {
    circle_id: record.circleId,
    amount: record.amount,
    date: record.date,
    note: record.note,
  };

  await withRetry(async () => {
    const { error } = await supabase
      .from('records')
      .update(dbRecord)
      .eq('id', record.id)
      .eq('user_id', userId);

    if (error) throw error;
  }).catch(error => {
    console.error('Error updating record:', error);
    throw error;
  });
};

export const deleteRecord = async (recordId: string, userId: string): Promise<void> => {
  await withRetry(async () => {
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId)
      .eq('user_id', userId); // Extra safety

    if (error) throw error;
  }).catch(error => {
    console.error('Error deleting record:', error);
    throw error;
  });
};

export const deleteAllRecords = async (userId: string): Promise<void> => {
  await withRetry(async () => {
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }).catch(error => {
    console.error('Error deleting all records:', error);
    throw error;
  });
};

export const deleteAllCircles = async (userId: string): Promise<void> => {
  await withRetry(async () => {
    const { error } = await supabase
      .from('circles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }).catch(error => {
    console.error('Error deleting all circles:', error);
    throw error;
  });
};

export const deleteAllPreferences = async (userId: string): Promise<void> => {
  await withRetry(async () => {
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }).catch(error => {
    console.error('Error deleting preferences:', error);
    throw error;
  });
};

// --- Circles ---

export const fetchCircles = async (userId: string, options?: FetchOptions): Promise<Circle[]> => {
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('circles')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }); // Sort by order

      if (error) throw error;
      return data;
    });

    if (!data || data.length === 0) {
      // Initializing default circles for new user in DB
      const newDefaultCircles = DEFAULT_CIRCLES.map((c, index) => ({
        ...c,
        id: generateId(),
        sortOrder: index // Use index as initial sort order
      }));
      await syncCircles(newDefaultCircles, userId);
      return newDefaultCircles;
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      isDefault: item.is_default,
      sortOrder: item.sort_order, // Map from DB
    }));
  } catch (error) {
    console.error('Error fetching circles:', error);
    if (options?.throwOnError) throw error;
    return DEFAULT_CIRCLES;
  }
};

// Sync circles: Upsert current list and delete removed ones
export const syncCircles = async (circles: Circle[], userId: string): Promise<void> => {
  // 1. Upsert all current circles
  const dbCircles = circles.map((c, index) => ({
    id: c.id,
    user_id: userId,
    name: c.name,
    is_default: c.isDefault || false,
    sort_order: c.sortOrder ?? index // Persist order
  }));

  await withRetry(async () => {
    const { error: upsertError } = await supabase
      .from('circles')
      .upsert(dbCircles);

    if (upsertError) throw upsertError;

    // 2. Delete circles not in the new list
    const currentIds = circles.map(c => c.id);

    // 构建删除查询 - 注意: Supabase 查询构建器是不可变的，必须赋值返回值
    let deleteQuery = supabase
      .from('circles')
      .delete()
      .eq('user_id', userId);

    if (currentIds.length > 0) {
      // 使用 .not() 方法排除需要保留的圈子，必须赋值回 deleteQuery
      deleteQuery = deleteQuery.not('id', 'in', `(${currentIds.join(',')})`);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;
  });
};

// --- Preferences ---

export const fetchPreferences = async (userId: string, options?: FetchOptions): Promise<UserPreferences> => {
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });

    if (!data) return DEFAULT_PREFERENCES;

    return {
      themeId: data.theme_id as any,
      backgroundImage: data.background_image,
    };
  } catch (error: any) {
    console.error('Error fetching preferences:', error?.message || error);
    if (options?.throwOnError) throw error;
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = async (prefs: UserPreferences, userId: string): Promise<void> => {
  const dbPrefs = {
    user_id: userId,
    theme_id: prefs.themeId,
    background_image: prefs.backgroundImage,
  };

  await withRetry(async () => {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(dbPrefs);
    if (error) throw error;
  }).catch(error => {
    console.error('Error saving preferences:', error);
  });
};

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

// Legacy local storage functions removed to enforce cloud sync
// kept fetchRecords, fetchCircles etc. as the new interface.
export const getRecords = (userId?: string): Record[] => []; // Deprecated shim
export const saveRecords = (records: Record[], userId?: string) => { }; // Deprecated shim
export const getCircles = (userId?: string): Circle[] => []; // Deprecated shim
