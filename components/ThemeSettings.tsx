import React from 'react';
import { ViewState, UserPreferences } from '../types';
import { ChevronLeft, Check } from 'lucide-react';

interface ThemeSettingsProps {
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  onNavigate: (view: ViewState) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ preferences, onUpdatePreferences, onNavigate }) => {

  const themes = [
    { id: 'default', name: '简约灰 (默认)', color: 'bg-gray-50', preview: 'bg-slate-50' },
    { id: 'green', name: '麻将绿', color: 'bg-mahjong-800', preview: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100' },
    { id: 'red', name: '喜庆红', color: 'bg-red-700', preview: 'bg-gradient-to-br from-orange-50 via-rose-50 to-slate-100' },
    { id: 'black', name: '至尊黑', color: 'bg-zinc-900', preview: 'bg-slate-900' },
    { id: 'blue', name: '禅意蓝', color: 'bg-blue-900', preview: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50' },
    { id: 'rich', name: '招财进宝', color: 'bg-red-600', preview: "bg-[url('/bg_rich.jpg')] bg-cover bg-top" },
  ];

  return (
    <div className="flex flex-col h-full bg-white/50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-4 h-14 flex items-center justify-between border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <button onClick={() => onNavigate(ViewState.SETTINGS)} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">背景设置</h2>
        <div className="w-8"></div>
      </div>

      <div className="p-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {/* Preset Themes */}
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onUpdatePreferences({ ...preferences, themeId: theme.id as any, backgroundImage: undefined })}
              className={`relative aspect-[3/5] rounded-xl overflow-hidden shadow-sm border-2 transition-all group ${preferences.themeId === theme.id ? 'border-mahjong-600 ring-2 ring-mahjong-200' : 'border-transparent hover:border-gray-300'
                }`}
            >
              <div className={`w-full h-full ${theme.preview}`}></div>
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-3 text-center">
                <span className="text-xs font-bold text-gray-700">{theme.name}</span>
              </div>
              {preferences.themeId === theme.id && (
                <div className="absolute top-2 right-2 bg-mahjong-600 text-white p-1 rounded-full shadow-md">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
