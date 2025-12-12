import { Circle, UserPreferences } from './types';

export const DAILY_QUOTES = [
  "牌品如人品，淡定见高低。",
  "输赢笑笑过，情义心头留。",
  "今日手气旺，清一色自摸。",
  "打牌不急躁，好运自然到。",
  "小赌怡情，大赌伤身。",
  "观棋不语真君子，落子无悔大丈夫。",
  "宁弃莫出铳，人旺我乱碰。",
  "心态稳得住，把把都能胡。",
];

export const DEFAULT_CIRCLES: Circle[] = [
  { id: '1', name: '未分组', isDefault: true },
  { id: '2', name: '楼下邻居' },
  { id: '3', name: '老同事' },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeId: 'default',
};

export const STORAGE_KEYS = {
  RECORDS: 'msj_records_v1',
  CIRCLES: 'msj_circles_v1',
  USER_PREFS: 'msj_prefs_v1',
};