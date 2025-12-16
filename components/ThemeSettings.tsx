import React, { useRef } from 'react';
import { ViewState, UserPreferences } from '../types';
import { ChevronLeft, Check, Image as ImageIcon, Upload } from 'lucide-react';

interface ThemeSettingsProps {
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  onNavigate: (view: ViewState) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ preferences, onUpdatePreferences, onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert("图片大小不能超过 4MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdatePreferences({
          ...preferences,
          backgroundImage: reader.result as string,
          themeId: 'custom'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const themes = [
    { id: 'default', name: '简约灰 (默认)', color: 'bg-gray-50', preview: 'bg-gray-50' },
    { id: 'green', name: '麻将绿', color: 'bg-mahjong-800', preview: 'bg-gradient-to-br from-[#166534] to-[#14532d]' },
    { id: 'red', name: '喜庆红', color: 'bg-red-700', preview: 'bg-gradient-to-br from-[#991b1b] to-[#9a3412]' },
    { id: 'black', name: '至尊黑', color: 'bg-zinc-900', preview: 'bg-gradient-to-br from-zinc-800 to-zinc-950' },
    { id: 'blue', name: '禅意蓝', color: 'bg-blue-900', preview: 'bg-gradient-to-br from-blue-800 to-blue-950' },
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

          {/* Custom Image Option */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-[3/5] rounded-xl overflow-hidden shadow-sm border-2 transition-all flex flex-col items-center justify-center bg-gray-100 ${preferences.themeId === 'custom' ? 'border-mahjong-600 ring-2 ring-mahjong-200' : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
          >
            {preferences.themeId === 'custom' && preferences.backgroundImage ? (
              <>
                <img
                  src={preferences.backgroundImage}
                  alt="Custom"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </>
            ) : null}

            <div className="z-10 flex flex-col items-center p-4">
              <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center mb-2 shadow-sm">
                {preferences.themeId === 'custom' ? <ImageIcon className="w-5 h-5 text-gray-700" /> : <Upload className="w-5 h-5 text-gray-500" />}
              </div>
              <span className={`text-xs font-bold ${preferences.themeId === 'custom' ? 'text-white text-shadow' : 'text-gray-500'}`}>
                {preferences.themeId === 'custom' ? '更换图片' : '自定义图片'}
              </span>
            </div>

            {preferences.themeId === 'custom' && (
              <div className="absolute top-2 right-2 bg-mahjong-600 text-white p-1 rounded-full shadow-md z-20">
                <Check className="w-3 h-3" />
              </div>
            )}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          提示：上传您喜欢的图片作为背景（建议竖屏图片）。<br />
          图片仅保存在您当前设备上。
        </p>
      </div>
    </div>
  );
};

export default ThemeSettings;