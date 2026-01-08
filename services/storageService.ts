
import { Record, Circle, UserPreferences } from '../types';
import { DEFAULT_CIRCLES, DEFAULT_PREFERENCES } from '../constants';
import { supabase } from './supabase';

/**
 * Helper to execute DB operations with auto-retry and session refresh
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await operation();
  } catch (err: any) {
    if (retries > 0) {
      // Check for likely Auth/Network errors
      // 401: Unauthorized (JWT expired/invalid)
      // 403: Forbidden (RLS policy, but sometimes requires refresh)
      // "JWT expired" message
      // Network errors (TypeError: Failed to fetch)
      const message = err?.message || '';
      const isAuthError =
        err?.status === 401 ||
        err?.status === 403 ||
        message.includes('JWT') ||
        message.includes('jwt');
      const isNetworkError =
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('connection');

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

export const fetchRecords = async (userId: string): Promise<Record[]> => {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }).catch(err => {
    console.error('Error fetching records:', err);
    return [];
  }).then(data => {
    // Map snake_case DB columns to camelCase TS interface
    return data.map((item: any) => ({
      id: item.id,
      circleId: item.circle_id,
      amount: Number(item.amount),
      date: item.date,
      note: item.note,
      timestamp: Number(item.timestamp),
    }));
  });
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

export const fetchCircles = async (userId: string): Promise<Circle[]> => {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }); // Sort by order

    if (error) throw error;

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
  }).catch(error => {
    console.error('Error fetching circles:', error);
    return DEFAULT_CIRCLES;
  });
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

    const query = supabase
      .from('circles')
      .delete()
      .eq('user_id', userId);

    if (currentIds.length > 0) {
      const filterValue = `(${currentIds.map(id => `"${id}"`).join(',')})`;
      query.filter('id', 'not.in', filterValue);
    }

    const { error: deleteError } = await query;
    if (deleteError) throw deleteError;
  });
};

// --- Preferences ---

export const fetchPreferences = async (userId: string): Promise<UserPreferences> => {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) return DEFAULT_PREFERENCES;

    return {
      themeId: data.theme_id as any,
      backgroundImage: data.background_image,
    };
  }).catch(error => {
    console.error('Error fetching preferences:', error.message);
    return DEFAULT_PREFERENCES;
  });
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
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Legacy local storage functions removed to enforce cloud sync
// kept fetchRecords, fetchCircles etc. as the new interface.
export const getRecords = (userId?: string): Record[] => []; // Deprecated shim
export const saveRecords = (records: Record[], userId?: string) => { }; // Deprecated shim
export const getCircles = (userId?: string): Circle[] => []; // Deprecated shim
