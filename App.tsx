
import React, { useState, useEffect } from 'react';
import { Record, Circle, ViewState, UserPreferences, User } from './types';
import * as Storage from './services/storageService';
import { authService } from './services/authService';
import { Network } from '@capacitor/network';
import { DEFAULT_PREFERENCES, DEFAULT_CIRCLES } from './constants';
import Dashboard from './components/Dashboard';
import AddRecord from './components/AddRecord';
import Navigation from './components/Navigation';
import CircleManager from './components/CircleManager';
import Statistics from './components/Statistics';
import Settings from './components/Settings';
import ThemeSettings from './components/ThemeSettings';
import Feedback from './components/Feedback';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  // State
  // Default to LOGIN directly
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [records, setRecords] = useState<Record[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // New: Block UI until auth check is done
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  // Lifted state for filtering (also used for default selection in AddRecord)
  const [selectedCircleId, setSelectedCircleId] = useState<string>('all');

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
            setView(ViewState.DASHBOARD);
          }
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
        // Show detailed error message to the user if needed, e.g., via a toast or alert
        // For now, just log it.
      } finally {
        if (mounted) {
          setIsInitializing(false);
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
              setView(ViewState.DASHBOARD);
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
          setView(ViewState.LOGIN);
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
  const refreshData = async (silent = false) => {
    if (!user) return;

    if (!silent) setIsLoading(true);
    try {
      const [loadedRecords, loadedCircles, loadedPrefs] = await Promise.all([
        Storage.fetchRecords(user.id),
        Storage.fetchCircles(user.id),
        Storage.fetchPreferences(user.id)
      ]);

      setRecords(loadedRecords);
      // Ensure circles is never empty to prevent UI issues
      setCircles(loadedCircles.length > 0 ? loadedCircles : DEFAULT_CIRCLES);
      setPreferences(loadedPrefs);
    } catch (error) {
      console.error("Failed to sync data", error);
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
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    await authService.logout();
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
      setView(ViewState.DASHBOARD);

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

      // Batch insert new records
      if (recordsToAdd.length > 0) {
        await Storage.addRecordsBatch(recordsToAdd, user.id);
      }

      setEditingRecord(null); // Clear edit state
    } catch (e) {
      console.error(e);
      alert("保存失败");
      // Rollback
      setRecords(originalRecords);
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
        alert("删除失败");
        setRecords(originalRecords);
      }
    }
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
    setView(ViewState.ADD_RECORD);
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

  const getBackgroundStyle = () => {
    if (view === ViewState.LOGIN) return { backgroundColor: '#f9fafb' };

    if (preferences.themeId === 'custom' && preferences.backgroundImage) {
      return { backgroundImage: `url(${preferences.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    switch (preferences.themeId) {
      case 'green':
        return { background: 'linear-gradient(to bottom right, #166534, #15803d, #14532d)' }; // Deeper Green
      case 'red':
        return { background: 'linear-gradient(to bottom right, #991b1b, #b91c1c, #9a3412)' }; // Richer Red
      case 'black':
        return { background: 'linear-gradient(to bottom right, #18181b, #27272a, #3f3f46)' }; // Elegant Black
      case 'blue':
        return { background: 'linear-gradient(to bottom right, #1e3a8a, #1d4ed8, #2563eb)' }; // Zen Blue
      case 'rich':
        return {
          backgroundImage: `url('/bg_rich.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat'
        };
      case 'default':
      default:
        return { backgroundColor: '#f9fafb' };
    }
  };

  const handleClearData = async () => {
    if (!user) return;
    try {
      await Storage.deleteAllRecords(user.id);
      setRecords([]);
      alert('已清空所有记录');
    } catch (e) {
      console.error(e);
      alert('清空失败');
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
              setView(ViewState.DASHBOARD);
              setEditingRecord(null);
              setAutoStartVoice(false);
            }}
            initialCircleId={selectedCircleId === 'all' ? undefined : selectedCircleId}
            initialRecord={editingRecord}
            initialAutoStartVoice={autoStartVoice}
          />
        );
      case ViewState.SETTINGS_CIRCLES:
        return (
          <CircleManager
            circles={circles}
            onUpdateCircles={handleUpdateCircles}
            onNavigate={setView}
            hasRecords={hasRecordsInCircle}
            onBack={() => setView(ViewState.SETTINGS)}
          />
        );
      case ViewState.SETTINGS_THEME:
        return (
          <ThemeSettings
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onNavigate={setView}
          />
        );
      case ViewState.SETTINGS_FEEDBACK:
        return (
          <Feedback
            onNavigate={setView}
            userId={user?.id}
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
            onNavigate={setView}
            user={user}
            onLogout={handleLogout}
            onClearData={handleClearData}
            onDataRefresh={refreshData}
          />
        );

      default:
        return (
          <Dashboard
            records={records}
            circles={circles}
            onDeleteRecord={handleDeleteRecord}
            onEditRecord={handleEditRecord}
            onNavigate={setView}
            themeId={preferences.themeId}
            selectedCircleId={selectedCircleId}
            onSelectCircle={setSelectedCircleId}
          />
        );
    }
  };

  return (
    <div
      className="h-full flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out pt-[env(safe-area-inset-top)]"
      style={getBackgroundStyle()}
    >
      <div className="flex-1 overflow-hidden relative">
        {isInitializing ? (
          <LoadingScreen isVisible={true} />
        ) : (
          renderContent()
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
            setView(v);
          }}
          onVoiceEntry={() => {
            setEditingRecord(null);
            setAutoStartVoice(true);
            setView(ViewState.ADD_RECORD);
          }}
        />
      )}
      <LoadingScreen isVisible={isLoading && view !== ViewState.LOGIN} />
    </div>
  );
};

export default App;