
import React, { useState, useEffect, useCallback } from 'react';
import { Record, Circle, ViewState, UserPreferences, User } from './types';
import * as Storage from './services/storageService';
import { authService } from './services/authService';
import { DEFAULT_PREFERENCES, DEFAULT_CIRCLES } from './constants';
import SplashScreen from './components/SplashScreen';
import Dashboard from './components/Dashboard';
import AddRecord from './components/AddRecord';
import Navigation from './components/Navigation';
import CircleManager from './components/CircleManager';
import Statistics from './components/Statistics';
import Settings from './components/Settings';
import ThemeSettings from './components/ThemeSettings';
import Login from './components/Login';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  // State
  // Default to SPLASH so it flashes on every load
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.SPLASH); 
  const [records, setRecords] = useState<Record[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);

  // Check Auth on Mount & Listen for Changes
  useEffect(() => {
    let mounted = true;

    // Safety timeout: If Supabase takes too long (e.g. network hang), force ready state after 3s
    // This prevents being stuck on Splash screen forever
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn("Auth check timed out - forcing ready state");
        setAuthInitialized(true);
      }
    }, 3000);

    // 1. Check active session
    authService.getCurrentUser()
      .then((currentUser) => {
        if (currentUser && mounted) {
            setUser(currentUser);
        }
      })
      .catch((err) => {
        console.warn("Auth check failed:", err);
      })
      .finally(() => {
        if (mounted) {
            setAuthInitialized(true);
            clearTimeout(safetyTimer);
        }
      });

    // 2. Listen for auth changes (e.g. login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
             try {
                const appUser = await authService.getCurrentUser();
                if (mounted) {
                    setUser(appUser);
                    // If we were on login screen, move to dashboard (skip splash if explicit login)
                    setView(current => current === ViewState.LOGIN ? ViewState.DASHBOARD : current);
                }
             } catch (e) {
                console.error("Error fetching user details after sign in", e);
             }
        } else if (event === 'SIGNED_OUT') {
             if (mounted) {
                setUser(null);
                setView(ViewState.LOGIN);
                setRecords([]);
                setCircles([]);
                setPreferences(DEFAULT_PREFERENCES);
             }
        }
    });

    return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
    };
  }, []);

  // Load Data from Supabase when User Changes
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
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
        // Don't alert here immediately on splash load to avoid disrupting UX
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Auth Handlers
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView(ViewState.DASHBOARD); // Directly to dashboard after manual login
  };

  const handleLogout = async () => {
    await authService.logout(); 
  };

  // Called automatically by SplashScreen when timer ends AND auth is ready
  // Wrapped in useCallback to ensure stability
  const handleSplashFinish = useCallback(() => {
    if (user) {
      setView(ViewState.DASHBOARD);
    } else {
      setView(ViewState.LOGIN);
    }
  }, [user]);

  // Data Handlers (Now Async)
  const handleSaveRecord = async (record: Record) => {
    if (!user) return;
    
    // Check if it's an update or new
    const isUpdate = records.some(r => r.id === record.id);
    const originalRecords = [...records];

    try {
      if (isUpdate) {
        // Optimistic Update
        setRecords(records.map(r => r.id === record.id ? record : r));
        setView(ViewState.DASHBOARD);
        await Storage.updateRecord(record, user.id);
      } else {
        // Optimistic Add
        setRecords([record, ...records]); 
        setView(ViewState.DASHBOARD);
        await Storage.addRecord(record, user.id);
      }
      setEditingRecord(null); // Clear edit state
    } catch (e) {
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
    } catch (e) {
      console.error(e);
      alert("圈子更新失败");
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
        return { background: 'linear-gradient(to bottom right, #166534, #16a34a)' };
      case 'red':
        return { background: 'linear-gradient(to bottom right, #b91c1c, #ea580c)' };
      case 'default':
      default:
        return { backgroundColor: '#f9fafb' };
    }
  };

  // Render Logic
  const renderContent = () => {
    switch (view) {
      case ViewState.LOGIN:
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case ViewState.SPLASH:
        return <SplashScreen onFinish={handleSplashFinish} isReady={authInitialized} />;
      case ViewState.ADD_RECORD:
        return (
          <AddRecord 
            circles={circles} 
            onSave={handleSaveRecord} 
            onCancel={() => {
                setView(ViewState.DASHBOARD);
                setEditingRecord(null);
            }} 
            initialCircleId={circles[0]?.id}
            initialRecord={editingRecord}
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
          />
        );
      case ViewState.DASHBOARD:
      default:
        return (
          <Dashboard 
            records={records} 
            circles={circles} 
            onDeleteRecord={handleDeleteRecord}
            onEditRecord={handleEditRecord}
            onNavigate={setView}
            themeId={preferences.themeId}
          />
        );
    }
  };

  return (
    <div 
      className="h-full flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out"
      style={getBackgroundStyle()}
    >
      <div className="flex-1 overflow-hidden relative">
        {isLoading && view !== ViewState.LOGIN && view !== ViewState.SPLASH && (
            <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-gray-200 overflow-hidden">
                <div className="h-full bg-mahjong-500 animate-pulse w-full origin-left transform scale-x-50"></div>
            </div>
        )}
        {renderContent()}
      </div>
      
      {/* Hide navigation on full-screen modes */}
      {view !== ViewState.LOGIN && view !== ViewState.SPLASH && view !== ViewState.ADD_RECORD && (
        <Navigation 
            currentView={view} 
            onChangeView={(v) => {
                // If manually switching to Add Record (bottom nav), treat as new record
                if (v === ViewState.ADD_RECORD) {
                    setEditingRecord(null);
                }
                setView(v);
            }} 
        />
      )}
    </div>
  );
};

export default App;
