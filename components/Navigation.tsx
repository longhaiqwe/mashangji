import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { Home, PlusCircle, PieChart, Settings, Mic, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 记录用户是否使用过语音记账功能
const VOICE_USED_STORAGE_KEY = 'voiceRecordingUsed';

interface NavigationProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onVoiceEntry?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView, onVoiceEntry }) => {
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPress = React.useRef(false);

  // 引导气泡状态 - 用户未使用过语音记账时始终显示
  const [showVoiceTip, setShowVoiceTip] = useState(false);

  // 检查用户是否已使用过语音记账
  useEffect(() => {
    const hasUsedVoice = localStorage.getItem(VOICE_USED_STORAGE_KEY);
    if (!hasUsedVoice && currentView === ViewState.DASHBOARD) {
      // 延迟显示，让用户先看到界面
      const showTimer = setTimeout(() => {
        setShowVoiceTip(true);
      }, 1000);

      return () => clearTimeout(showTimer);
    } else {
      setShowVoiceTip(false);
    }
  }, [currentView]);

  // 标记用户使用过语音记账，隐藏气泡
  const markVoiceUsed = () => {
    setShowVoiceTip(false);
    localStorage.setItem(VOICE_USED_STORAGE_KEY, 'true');
  };

  const dismissTip = () => {
    setShowVoiceTip(false);
    // 仅临时隐藏，不标记为已使用
  };

  const handleTouchStart = (view: ViewState) => {
    if (view === ViewState.ADD_RECORD && onVoiceEntry) {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        // Haptic feedback if available (Web Vibration API)
        if (navigator.vibrate) navigator.vibrate(50);
        markVoiceUsed(); // 标记用户已使用语音记账
        onVoiceEntry();
      }, 800); // 800ms threshold
    }
  };

  const handleTouchEnd = (view: ViewState) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Only trigger normal click if it wasn't a long press
    if (!isLongPress.current) {
      onChangeView(view);
    }
    isLongPress.current = false;
  };

  // Map sub-views to their parent nav item for highlighting
  const getActiveNav = (view: ViewState) => {
    if (view === ViewState.SETTINGS_CIRCLES) {
      return ViewState.SETTINGS;
    }
    return view;
  };

  const activeView = getActiveNav(currentView);

  const navItems = [
    { view: ViewState.DASHBOARD, label: '首页', icon: Home },
    { view: ViewState.ADD_RECORD, label: '记账', icon: PlusCircle, highlight: true },
    { view: ViewState.STATS, label: '统计', icon: PieChart },
    { view: ViewState.SETTINGS, label: '设置', icon: Settings },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] relative z-20">
      <div className="flex justify-around items-end h-16 pb-1">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <div key={item.view} className="relative flex flex-col items-center justify-center -mt-8">
                {/* 引导气泡 - 在记账按钮右上方 */}
                <AnimatePresence>
                  {showVoiceTip && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -5, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="absolute left-[calc(50%+24px)] bottom-[80px] z-[100]"
                      onClick={(e) => {
                        e.stopPropagation();
                        markVoiceUsed();
                        if (onVoiceEntry) onVoiceEntry();
                      }}
                    >
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/30 whitespace-nowrap flex items-center space-x-2 cursor-pointer hover:scale-105 transition-transform">
                        <Mic className="w-4 h-4" />
                        <span className="text-sm font-medium">长按可语音记账哦！</span>
                        <X className="w-3.5 h-3.5 opacity-60" onClick={(e) => { e.stopPropagation(); dismissTip(); }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  // Mouse events for desktop testing
                  onMouseDown={() => handleTouchStart(item.view)}
                  onMouseUp={() => handleTouchEnd(item.view)}
                  onMouseLeave={() => {
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                  }}
                  // Touch events for mobile
                  onTouchStart={() => handleTouchStart(item.view)}
                  onTouchEnd={(e) => {
                    e.preventDefault(); // Prevent ghost click
                    handleTouchEnd(item.view);
                  }}
                  className="flex flex-col items-center justify-center select-none touch-none"
                >
                  <div className="bg-primary-600 rounded-full p-4 shadow-lg shadow-emerald-500/30 border-4 border-slate-50 transform transition-transform active:scale-95">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 mt-1">{item.label}</span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400'
                }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;