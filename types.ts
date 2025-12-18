
export interface Circle {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface Record {
  id: string;
  circleId: string;
  amount: number;
  date: string; // ISO Date string YYYY-MM-DD
  note?: string;
  timestamp: number; // For sorting
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  ADD_RECORD = 'ADD_RECORD',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS',          // Main Settings Menu
  SETTINGS_CIRCLES = 'SETTINGS_CIRCLES', // Sub-page
  SETTINGS_THEME = 'SETTINGS_THEME',     // Sub-page
  SETTINGS_FEEDBACK = 'SETTINGS_FEEDBACK', // Sub-page
}

export interface SummaryStats {
  totalPnL: number;
  monthlyPnL: number;
  totalGames: number;
  winRate: number;
}

export interface UserPreferences {
  backgroundImage?: string; // Data URL or null
  themeId: 'default' | 'green' | 'red' | 'black' | 'blue' | 'rich' | 'custom';
}