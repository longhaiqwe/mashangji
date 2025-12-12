
import { Record, Circle, UserPreferences } from '../types';
import { DEFAULT_CIRCLES, DEFAULT_PREFERENCES } from '../constants';
import { supabase } from './supabase';

// --- Records ---

export const fetchRecords = async (userId: string): Promise<Record[]> => {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching records:', error);
    return [];
  }

  // Map snake_case DB columns to camelCase TS interface
  return data.map((item: any) => ({
    id: item.id,
    circleId: item.circle_id,
    amount: Number(item.amount),
    date: item.date,
    note: item.note,
    timestamp: Number(item.timestamp),
  }));
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

  const { error } = await supabase.from('records').insert(dbRecord);

  if (error) {
    console.error('Error adding record:', error);
    throw error;
  }
  return record;
};

export const deleteRecord = async (recordId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', userId); // Extra safety

  if (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
};

// --- Circles ---

export const fetchCircles = async (userId: string): Promise<Circle[]> => {
  const { data, error } = await supabase
    .from('circles')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching circles:', error);
    return DEFAULT_CIRCLES;
  }

  if (!data || data.length === 0) {
    // Initializing default circles for new user in DB
    await syncCircles(DEFAULT_CIRCLES, userId);
    return DEFAULT_CIRCLES;
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    isDefault: item.is_default,
  }));
};

// Sync circles: Upsert current list and delete removed ones
export const syncCircles = async (circles: Circle[], userId: string): Promise<void> => {
  // 1. Upsert all current circles
  const dbCircles = circles.map(c => ({
    id: c.id,
    user_id: userId,
    name: c.name,
    is_default: c.isDefault || false
  }));

  const { error: upsertError } = await supabase
    .from('circles')
    .upsert(dbCircles);

  if (upsertError) throw upsertError;

  // 2. Delete circles not in the new list
  const currentIds = circles.map(c => c.id);
  const { error: deleteError } = await supabase
    .from('circles')
    .delete()
    .eq('user_id', userId)
    .not('id', 'in', `(${currentIds.map(id => `"${id}"`).join(',')})`); // Safe ID formatting

  if (deleteError) throw deleteError;
};

// --- Preferences ---

export const fetchPreferences = async (userId: string): Promise<UserPreferences> => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return DEFAULT_PREFERENCES;
  }

  return {
    themeId: data.theme_id as any,
    backgroundImage: data.background_image,
  };
};

export const savePreferences = async (prefs: UserPreferences, userId: string): Promise<void> => {
  const dbPrefs = {
    user_id: userId,
    theme_id: prefs.themeId,
    background_image: prefs.backgroundImage,
  };

  const { error } = await supabase
    .from('user_preferences')
    .upsert(dbPrefs);

  if (error) {
    console.error('Error saving preferences:', error);
  }
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Legacy local storage functions removed to enforce cloud sync
// kept fetchRecords, fetchCircles etc. as the new interface.
export const getRecords = (userId?: string): Record[] => []; // Deprecated shim
export const saveRecords = (records: Record[], userId?: string) => {}; // Deprecated shim
export const getCircles = (userId?: string): Circle[] => []; // Deprecated shim
// export const saveCircles... // Deprecated shim
