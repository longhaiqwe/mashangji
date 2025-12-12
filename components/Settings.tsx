
import React from 'react';
import { ViewState, User } from '../types';
import { Users, Palette, ChevronRight, Info, LogOut, UserCircle } from 'lucide-react';
import { authService } from '../services/authService';

interface SettingsProps {
  onNavigate: (view: ViewState) => void;
  user?: User | null;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate, user, onLogout }) => {
  const handleLogout = () => {
    // Simply clear storage and trigger UI update
    authService.logout();
    onLogout();
  };

  const menuItems = [
    {
      id: 'circles',
      label: '圈子管理',
      icon: Users,
      onClick: () => onNavigate(ViewState.SETTINGS_CIRCLES),
      desc: '添加或删除打牌圈子'
    },
    {
      id: 'theme',
      label: '背景设置',
      icon: Palette,
      onClick: () => onNavigate(ViewState.SETTINGS_THEME),
      desc: '更换应用背景壁纸'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white/50">
      <div className="bg-white/80 backdrop-blur-sm px-4 h-14 flex items-center justify-center border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-800">设置</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* User Profile Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-mahjong-100 rounded-full flex items-center justify-center text-mahjong-600">
                 <UserCircle className="w-8 h-8" />
              </div>
              <div>
                 <h3 className="font-bold text-gray-800">{user?.username || '用户'}</h3>
                 <p className="text-xs text-gray-500">已登录</p>
              </div>
           </div>
           <button 
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500 text-xs font-bold rounded-lg transition-colors flex items-center cursor-pointer active:scale-95 border border-gray-200"
           >
              <LogOut className="w-3 h-3 mr-1" /> 退出
           </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-sm border border-gray-100">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <button
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-mahjong-50 flex items-center justify-center text-mahjong-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                {index < menuItems.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
              </div>
            );
          })}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-gray-100 flex items-start space-x-3">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-gray-600 mb-1">关于麻上记</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              一款极简的个人麻将记账工具。数据通过本地账号隔离，保障隐私。
              <br/>
              Version 1.1.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
