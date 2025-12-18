import React from 'react';
import { ViewState } from '../types';
import { Home, PlusCircle, PieChart, Settings } from 'lucide-react';

interface NavigationProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onVoiceEntry?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView, onVoiceEntry }) => {
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPress = React.useRef(false);

  const handleTouchStart = (view: ViewState) => {
    if (view === ViewState.ADD_RECORD && onVoiceEntry) {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            // Haptic feedback if available (Web Vibration API)
            if (navigator.vibrate) navigator.vibrate(50);
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
    if (view === ViewState.SETTINGS_CIRCLES || view === ViewState.SETTINGS_THEME) {
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
    <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 pb-[env(safe-area-inset-bottom)] relative z-20">
      <div className="flex justify-around items-end h-16 pb-1">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;
          
          if (item.highlight) {
            return (
              <button
                key={item.view}
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
                className="flex flex-col items-center justify-center -mt-8 select-none touch-none"
              >
                <div className="bg-mahjong-600 rounded-full p-4 shadow-lg border-4 border-gray-50 transform transition-transform active:scale-95">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-500 mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-mahjong-600' : 'text-gray-400'
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