
import React, { useState, useEffect, useMemo } from 'react';
import { Record, Circle, ViewState, UserPreferences, User } from './types';
import * as Storage from './services/storageService';
import { authService } from './services/authService';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { DEFAULT_PREFERENCES, DEFAULT_CIRCLES } from './constants';
import Dashboard from './components/Dashboard';
import AddRecord from './components/AddRecord';
import Navigation from './components/Navigation';
import CircleManager from './components/CircleManager';
import Statistics from './components/Statistics';
import Settings from './components/Settings';

import Feedback from './components/Feedback';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';
import { supabase } from './services/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { useParticleEffect } from './components/ui/ParticleEffect';
import { useVoiceTrial } from './hooks/useVoiceTrial';
import TrialExhaustedModal from './components/TrialExhaustedModal';



// 页面层级定义 - 用于决定转场动画方向
const PAGE_LEVEL: { [key in ViewState]: number } = {
  [ViewState.LOGIN]: 0,
  [ViewState.DASHBOARD]: 1,
  [ViewState.STATS]: 2,
  [ViewState.SETTINGS]: 2,
  [ViewState.ADD_RECORD]: 3,
  [ViewState.SETTINGS_CIRCLES]: 3,

  [ViewState.SETTINGS_FEEDBACK]: 3,
};

// 页面转场动画 variants
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.1, 0.25, 1], // 自定义缓动曲线
  duration: 0.3,
};

const App: React.FC = () => {
  // State
  // Default to LOGIN directly
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // New: Block UI until auth check is done
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  // Lifted state for filtering (also used for default selection in AddRecord)
  const [selectedCircleId, setSelectedCircleId] = useState<string>('all');
  const [showTrialExhausted, setShowTrialExhausted] = useState(false);

  // Voice Trial Hook
  const { canUseVoice } = useVoiceTrial();

  // 粒子特效系统
  const particleEffect = useParticleEffect();

  // 计算页面切换方向 - 用于转场动画
  const direction = useMemo(() => {
    if (!previousView) return 0;
    const currentLevel = PAGE_LEVEL[view];
    const previousLevel = PAGE_LEVEL[previousView];
    return currentLevel - previousLevel;
  }, [view, previousView]);

  // 包装 setView 以跟踪 previousView
  const changeView = (newView: ViewState) => {
    setPreviousView(view);
    setView(newView);
  };

  // Check Auth on Mount & Listen for Changes
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Check active session
        const currentUser = await authService.getCurrentUser();
        if (mounted) {
          if (currentUser) {
            setUser(currentUser);
            changeView(ViewState.DASHBOARD);
          }
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
        // Show detailed error message to the user if needed, e.g., via a toast or alert
        // For now, just log it.
      } finally {
        if (mounted) {
          setIsInitializing(false);
          // 隐藏原生启动屏 - 确保 React 已准备好后再显示 WebView 内容
          SplashScreen.hide();
        }
      }
    };

    initAuth();

    // Network Status Listener
    Network.addListener('networkStatusChange', async (status) => {
      console.log('Network status changed:', status.connected);
      if (status.connected) {
        // If we are not logged in, try checking session again.
        // This helps if the app launched offline/blocked and then got permission.
        // We only do this if we don't have a user yet.
        if (!user) { // Note: 'user' from closure might be stale, but initAuth handles it. 
          // Actually, inside useEffect, 'user' is the initial val (null).
          // Better to just call initAuth again or a silent check.
          // We can re-use logic similar to initAuth but without setting isInitializing=true to avoid flicker
          try {
            const currentUser = await authService.getCurrentUser();
            if (mounted && currentUser) {
              setUser(currentUser);
              changeView(ViewState.DASHBOARD);
            }
          } catch (e) { /* ignore */ }
        }
      }
    });

    // Failsafe: Force initialization to finish after 3s max
    const timer = setTimeout(() => {
      if (mounted) setIsInitializing(false);
    }, 3000);

    // 2. Listen for auth changes (e.g. login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        // ... (existing logic)
        try {
          // We might already have user from initAuth, but this ensures safe updates
          // If it's the initial event, it might double-fire with initAuth, but React handles state dedup.
          const appUser = await authService.getCurrentUser();
          if (mounted) {
            setUser(appUser);
            setView(current => current === ViewState.LOGIN ? ViewState.DASHBOARD : current);
            // Ensure loading is off if we just signed in
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Error fetching user details", e);
          if (mounted) setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          changeView(ViewState.LOGIN);
          setRecords([]);
          setCircles([]);
          setPreferences(DEFAULT_PREFERENCES);
          setIsLoading(false);
        }
      }
    });

    // 3. Clear storage on page unload to achieve "ephemeral session"
    const handleUnload = () => {
      // Clear Supabase tokens when user leaves/refreshes
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('sb-')) {
            window.localStorage.removeItem(key);
          }
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Handle Late User Loading removed - logic is now in initAuth


  // Load Data from Supabase
  const refreshData = async (
    silentOrOptions: boolean | { silent?: boolean; strict?: boolean } = false
  ): Promise<boolean> => {
    const silent = typeof silentOrOptions === 'boolean'
      ? silentOrOptions
      : Boolean(silentOrOptions.silent);
    const strict = typeof silentOrOptions === 'object'
      ? Boolean(silentOrOptions.strict)
      : false;
    if (!user) return false;

    if (!silent) setIsLoading(true);
    try {
      const [loadedRecords, loadedCircles, loadedPrefs] = await Promise.all([
        Storage.fetchRecords(user.id, { throwOnError: strict }),
        Storage.fetchCircles(user.id, { throwOnError: strict }),
        Storage.fetchPreferences(user.id, { throwOnError: strict })
      ]);

      setRecords(loadedRecords);
      // Ensure circles is never empty to prevent UI issues
      setCircles(loadedCircles.length > 0 ? loadedCircles : DEFAULT_CIRCLES);
      setPreferences(loadedPrefs);
      return true;
    } catch (error) {
      console.error("Failed to sync data", error instanceof Error ? error.message : JSON.stringify(error));
      return false;
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user?.id]); // Only reload if user ID changes

  // Auth Handlers
  const handleLoginSuccess = (loggedInUser: User) => {
    // Rely on onAuthStateChange to set the user and trigger data loading
    // BUT we also set it here to ensure UI responsiveness and fail-safe
    // independent of the event listener latency.
    // The useEffect [user?.id] dependency prevents duplicate data fetching.
    setIsLoading(true);
    setUser(loggedInUser);
    changeView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    // Fire-and-forget: Don't wait for server signOut to complete
    // This ensures instant UI response. Server token revocation happens in background.
    authService.logout();

    // Immediately clear local state for fast UI transition
    setUser(null);
    changeView(ViewState.LOGIN);
    setRecords([]);
    setCircles([]);
    setPreferences(DEFAULT_PREFERENCES);
  };

  // Data Handlers
  const handleSaveRecord = async (recordOrRecords: Record | Record[]) => {
    if (!user) return;

    const newRecords = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
    const originalRecords = [...records];

    // Check if it's an update or new (assuming batch is always new for now, but safe to check)
    // Actually, batch import from AI will always be new records with new IDs.
    // But for robustness, let's handle mixed cases if needed (though unlikely here).

    try {
      // Optimistic Update
      let updatedRecords = [...records];

      for (const record of newRecords) {
        const isUpdate = records.some(r => r.id === record.id);
        if (isUpdate) {
          updatedRecords = updatedRecords.map(r => r.id === record.id ? record : r);
        } else {
          updatedRecords = [record, ...updatedRecords];
        }
      }

      // Sort by timestamp desc
      updatedRecords.sort((a, b) => b.timestamp - a.timestamp);

      setRecords(updatedRecords);
      changeView(ViewState.DASHBOARD);

      // Persist to DB
      const recordsToAdd: Record[] = [];

      for (const record of newRecords) {
        const isUpdate = originalRecords.some(r => r.id === record.id);
        if (isUpdate) {
          // For updates, we still do them one by one as they might be sparse
          await Storage.updateRecord(record, user.id);
        } else {
          recordsToAdd.push(record);
        }
      }

      // Insert new records
      if (recordsToAdd.length === 1) {
        await Storage.addRecord(recordsToAdd[0], user.id);
      } else if (recordsToAdd.length > 1) {
        await Storage.addRecordsBatch(recordsToAdd, user.id);
      }

      // 触发粒子特效（仅在单个新记录时）
      if (recordsToAdd.length === 1) {
        const newRecord = recordsToAdd[0];
        const totalAmount = newRecord.amount;
        // 延迟触发，让页面切换动画先开始
        setTimeout(() => {
          if (totalAmount > 0) {
            particleEffect.trigger('win');
          } else if (totalAmount < 0) {
            particleEffect.trigger('loss');
          }
        }, 300);
      }

      setEditingRecord(null); // Clear edit state
    } catch (e) {
      console.error(e);
      alert("保存失败，已尝试重新同步");
      const synced = await refreshData({ silent: true, strict: true });
      if (!synced) {
        // Rollback only if we couldn't reconcile with server
        setRecords(originalRecords);
      }
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!user) return;
    if (confirm('确定要删除这条记录吗？')) {
      const originalRecords = [...records];
      try {
        setRecords(records.filter(r => r.id !== id));
        await Storage.deleteRecord(id, user.id);
      } catch (e) {
        alert("删除失败，已尝试重新同步");
        const synced = await refreshData({ silent: true, strict: true });
        if (!synced) {
          setRecords(originalRecords);
        }
      }
    }
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
    changeView(ViewState.ADD_RECORD);
  };

  const handleUpdateCircles = async (newCircles: Circle[]) => {
    if (!user) return;
    try {
      setCircles(newCircles);
      await Storage.syncCircles(newCircles, user.id);
    } catch (e: any) {
      console.error(e);
      alert(`圈子更新失败: ${e.message || JSON.stringify(e)}`);
      // Rollback
      refreshData(true); // Re-fetch correct state from DB
    }
  };

  const handleUpdatePreferences = async (newPrefs: UserPreferences) => {
    if (!user) return;
    setPreferences(newPrefs);
    Storage.savePreferences(newPrefs, user.id);
  };

  const hasRecordsInCircle = (circleId: string) => {
    return records.some(r => r.circleId === circleId);
  };

  const getThemeConfig = () => {
    // 在初始化阶段使用白色背景，与 LoadingScreen 保持一致，避免闪烁
    if (isInitializing) return { className: 'bg-white', style: {} };
    if (view === ViewState.LOGIN) return { className: 'bg-slate-50', style: {} };

    if (preferences.themeId === 'custom' && preferences.backgroundImage) {
      return {
        className: 'bg-slate-900', // Fallback
        style: { backgroundImage: `url(${preferences.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      };
    }

    switch (preferences.themeId) {
      case 'green':
        return { className: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100', style: {} };
      case 'red':
        return { className: 'bg-gradient-to-br from-orange-50 via-rose-50 to-slate-100', style: {} };
      case 'black':
        return { className: 'bg-slate-900', style: {} };
      case 'blue':
        return { className: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50', style: {} };
      case 'rich':
        return {
          className: 'bg-slate-800',
          style: {
            backgroundImage: `url('/bg_rich.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat'
          }
        };
      case 'default':
      default:
        return { className: 'bg-slate-50', style: {} };
    }
  };

  const themeConfig = getThemeConfig();

  const handleClearData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // 1. Delete all records
      await Storage.deleteAllRecords(user.id);
      setRecords([]);

      // 2. Delete all circles
      await Storage.deleteAllCircles(user.id);
      setCircles([]);

      // 3. Refresh to trigger default circles re-creation
      await refreshData(true); // silent refresh, but we already set loading true above if we wanted

      alert('账户已重置：所有记录已清空，圈子已恢复默认。');
    } catch (e) {
      console.error(e);
      alert('重置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Logic
  const renderContent = () => {
    switch (view) {
      case ViewState.LOGIN:
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case ViewState.ADD_RECORD:
        return (
          <AddRecord
            circles={circles}
            onSave={handleSaveRecord}
            onCancel={() => {
              changeView(ViewState.DASHBOARD);
              setEditingRecord(null);
              setAutoStartVoice(false);
            }}
            initialCircleId={selectedCircleId === 'all' ? undefined : selectedCircleId}
            initialRecord={editingRecord}
            initialAutoStartVoice={autoStartVoice}
            themeId={preferences.themeId}
          />
        );
      case ViewState.SETTINGS_CIRCLES:
        return (
          <CircleManager
            circles={circles}
            onUpdateCircles={handleUpdateCircles}
            onNavigate={changeView}
            hasRecords={hasRecordsInCircle}
            onBack={() => changeView(ViewState.SETTINGS)}
            themeId={preferences.themeId}
          />
        );

      case ViewState.SETTINGS_FEEDBACK:
        return (
          <Feedback
            onNavigate={changeView}
            userId={user?.id}
            themeId={preferences.themeId}
          />
        );
      case ViewState.STATS:
        return (
          <Statistics
            records={records}
            circles={circles}
            themeId={preferences.themeId}
          />
        );
      case ViewState.SETTINGS:
        return (
          <Settings
            onNavigate={changeView}
            user={user}
            onLogout={handleLogout}
            onClearData={handleClearData}
            onDataRefresh={refreshData}
            themeId={preferences.themeId}
          />
        );

      default:
        return (
          <Dashboard
            records={records}
            circles={circles}
            onDeleteRecord={handleDeleteRecord}
            onEditRecord={handleEditRecord}
            onNavigate={changeView}
            themeId={preferences.themeId}
            selectedCircleId={selectedCircleId}
            onSelectCircle={setSelectedCircleId}
          />
        );
    }
  };

  return (
    <div
      className={`h-full flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out pt-[env(safe-area-inset-top)] ${themeConfig.className}`}
      style={themeConfig.style}
    >
      <div className="flex-1 overflow-hidden relative">
        {isInitializing ? (
          <LoadingScreen isVisible={true} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="absolute inset-0"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Hide navigation on full-screen modes */}
      {!isInitializing && view !== ViewState.LOGIN && view !== ViewState.ADD_RECORD && (
        <Navigation
          currentView={view}
          onChangeView={(v) => {
            // If manually switching to Add Record (bottom nav), treat as new record
            if (v === ViewState.ADD_RECORD) {
              setEditingRecord(null);
              setAutoStartVoice(false);
            }
            changeView(v);
          }}
          onVoiceEntry={() => {
            if (canUseVoice) {
              setEditingRecord(null);
              setAutoStartVoice(true);
              changeView(ViewState.ADD_RECORD);
            } else {
              setShowTrialExhausted(true);
            }
          }}
        />
      )}
      <LoadingScreen isVisible={isLoading && view !== ViewState.LOGIN} />

      {/* 粒子特效 */}
      <particleEffect.Component />

      {/* Trial Exhausted Prompt (Global) */}
      <TrialExhaustedModal
        isOpen={showTrialExhausted}
        onClose={() => {
          setShowTrialExhausted(false);
          // Return to dashboard when closing the prompt
          changeView(ViewState.DASHBOARD);
        }}
      />
    </div>
  );
};

export default App;
