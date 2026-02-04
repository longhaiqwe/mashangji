
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Record } from '../types';
import { ChevronLeft, Calendar, FileText, Check, Users, Sparkles, X, Loader2, Trash2, RefreshCw, Mic, MicOff, Crown } from 'lucide-react';
import { generateId } from '../services/storageService';
import { analyzeText, ParsedRecord } from '../services/geminiService';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Keyboard } from '@capacitor/keyboard';
import { useVoiceTrial } from '../hooks/useVoiceTrial';
import TrialExhaustedModal from './TrialExhaustedModal';

type ImportMode = 'batch' | 'voice';

interface AddRecordProps {
  circles: Circle[];
  onSave: (record: Record | Record[]) => void;
  onCancel: () => void;
  initialCircleId?: string;
  initialRecord?: Record | null; // For editing
  initialAutoStartVoice?: boolean;
  themeId?: string;
}

const AddRecord: React.FC<AddRecordProps> = ({
  circles,
  onSave,
  onCancel,
  initialCircleId,
  initialRecord,
  initialAutoStartVoice = false,
  themeId = 'default'
}) => {

  // 判断是否为深色主题
  const isDarkTheme = themeId === 'black' || themeId === 'rich';

  // 根据主题设置颜色
  const bgClass = isDarkTheme ? 'bg-dark-bg-primary' : 'bg-light-bg-primary';
  const textPrimary = isDarkTheme ? 'text-white' : 'text-dark-bg-primary';
  const textSecondary = isDarkTheme ? 'text-text-secondary' : 'text-slate-500';
  const bgSecondary = isDarkTheme ? 'bg-dark-bg-secondary' : 'bg-white';
  const borderClass = isDarkTheme ? 'border-dark-border/20' : 'border-slate-200';
  const inputBg = isDarkTheme ? 'bg-dark-bg-secondary' : 'bg-slate-50';

  const [amount, setAmount] = useState<string>('');
  const [isWin, setIsWin] = useState<boolean>(true);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [circleId, setCircleId] = useState<string>(() => {
    if (initialCircleId) return initialCircleId;
    const defaultCircle = circles.find(c => c.isDefault);
    return defaultCircle ? defaultCircle.id : (circles[0]?.id || '');
  });
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  // AI Import State
  const [showImportModal, setShowImportModal] = useState(initialAutoStartVoice);
  const [importMode, setImportMode] = useState<ImportMode>(initialAutoStartVoice ? 'voice' : 'batch');
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParsedRecord[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info', message: string } | null>(null);

  // Keep track of the original text for re-analysis
  const [lastImportText, setLastImportText] = useState('');

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [tempTranscript, setTempTranscript] = useState('');
  const [autoStartVoice, setAutoStartVoice] = useState(initialAutoStartVoice);

  // Keyboard height for iOS
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Voice trial state
  const { trialUsed, trialLimit, remaining, canUseVoice, isPro, incrementUsage, loading: trialLoading } = useVoiceTrial();
  const [showTrialExhausted, setShowTrialExhausted] = useState(false);

  // Ref to keep track of latest importText for async operations
  const importTextRef = React.useRef(importText);
  useEffect(() => {
    importTextRef.current = importText;
  }, [importText]);

  // Sync prop to state to handle re-navigation/long-press when component is already mounted
  useEffect(() => {
    if (initialAutoStartVoice) {
      // 这里的 canUseVoice 基于 localStorage 同步初始化，可以直接使用
      if (!canUseVoice) {
        setShowTrialExhausted(true);
      } else {
        setImportMode('voice');
        setAutoStartVoice(true);
        setShowImportModal(true);
      }
    }
  }, [initialAutoStartVoice, canUseVoice]);

  const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  // 监听键盘高度 - 使用 ref 缓存上次的键盘高度
  const lastKeyboardHeightRef = React.useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 同时监听 WillShow 和 DidShow，确保不会错过事件
    const willShowListener = Keyboard.addListener('keyboardWillShow', (info) => {
      lastKeyboardHeightRef.current = info.keyboardHeight;
      setKeyboardHeight(info.keyboardHeight);
    });

    const didShowListener = Keyboard.addListener('keyboardDidShow', (info) => {
      // 如果 WillShow 没触发，DidShow 作为备份
      if (keyboardHeight === 0 && info.keyboardHeight > 0) {
        lastKeyboardHeightRef.current = info.keyboardHeight;
        setKeyboardHeight(info.keyboardHeight);
      }
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      willShowListener.then(handle => handle.remove());
      didShowListener.then(handle => handle.remove());
      hideListener.then(handle => handle.remove());
    };
  }, [keyboardHeight]);



  useEffect(() => {
    // Silence Detection: Auto-stop recording if no speech for 2.5 seconds
    if (isListening) {
      // Clear existing timer on any update (speech detected)
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Only start timer if we have some content (to avoid stopping before user starts speaking)
      if (importText || tempTranscript) {
        silenceTimerRef.current = setTimeout(() => {
          // Double check we are still listening and have content
          if (isListening && (importTextRef.current || tempTranscript)) {
            toggleListening();
          }
        }, 2000); // 2 seconds silence threshold
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isListening, importText, tempTranscript]); // Re-run on transcript update

  // Initialize Web Speech API or Native Listeners
  useEffect(() => {
    // Web Speech API Setup
    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const r = new SpeechRecognition();
        r.continuous = true; // Use continuous for better flow, handle stop manually
        r.interimResults = true;
        r.lang = 'zh-CN';

        r.onstart = () => setIsListening(true);
        r.onend = () => setIsListening(false);
        r.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        r.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (final) {
            setImportText(prev => prev + (prev ? ' ' : '') + final);
            setTempTranscript('');
          }
          if (interim) {
            setTempTranscript(interim);
          }
        };
        setRecognition(r);
      }
    }

    // Native Listeners Setup
    if (Capacitor.isNativePlatform()) {
      SpeechRecognition.removeAllListeners();
      SpeechRecognition.addListener('partialResults', (data: any) => {
        if (data.matches && data.matches.length > 0) {
          // Native usually returns the full accumulated string for the current session
          setTempTranscript(data.matches[0]);
        }
      });
    }
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.removeAllListeners();
        // Force stop if still listening
        SpeechRecognition.stop().catch(() => { });
      }
      if (recognition) {
        recognition.stop();
      }
    };
  }, [recognition]);

  // Auto-start voice if requested
  useEffect(() => {
    if (showImportModal) {
      // Always reset state when modal opens to prevent stale data
      setImportText('');
      setTempTranscript('');
      setParsedResults([]);
      setLastImportText('');
      setFeedback(null);

      if (autoStartVoice) {
        setImportMode('voice');
        // Force blur any active element to prevent keyboard from showing up
        // This is critical for iOS where keyboard might pop up on view change
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        // Small delay to ensure modal is ready and UI is stable
        const timer = setTimeout(() => {
          toggleListening();
          setAutoStartVoice(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [showImportModal, autoStartVoice]);

  const handleUserCloseModal = () => {
    // If user manually closes the modal and it was auto-started (e.g. from home shortcut),
    // we should probably exit the whole AddRecord screen
    if (initialAutoStartVoice) {
      onCancel();
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    // Clean up voice recording if active
    if (isListening || recognition) {
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.stop().catch(() => { });
      }
      if (recognition) {
        try {
          recognition.stop();
          // Optional: abort to completely free resources? recognition.abort();
        } catch (e) {
          console.warn("Stop recognition error:", e);
        }
      }
      setIsListening(false);
    }
    setShowImportModal(false);
  };

  const toggleListening = async () => {
    // Clear previous feedback when starting new recording
    if (!isListening) {
      setFeedback(null);
      // Clear previous input text when starting new recording manually
      // Only if we are not in the middle of editing (heuristic: if there is text but no analysis results)
      // But user request is "click voice input button, delete existing content"
      // So we clear it.
      setImportText('');
      setTempTranscript('');
    }

    // Native Logic
    if (Capacitor.isNativePlatform()) {
      if (isListening) {
        // Native stop can sometimes hang on Android
        try {
          await Promise.race([
            SpeechRecognition.stop(),
            new Promise(resolve => setTimeout(resolve, 1000))
          ]);
        } catch (e) {
          console.warn('Native stop warning:', e);
        }

        // Commit temp transcript
        // Use importTextRef to get current text, avoiding stale closure
        const currentImportText = importTextRef.current;
        let finalText = currentImportText;
        if (tempTranscript) {
          finalText = currentImportText + (currentImportText ? ' ' : '') + tempTranscript;
          setImportText(finalText);
          setTempTranscript('');
        }
        setIsListening(false);

        // Auto Analyze after stopping
        setTimeout(() => {
          if (finalText && finalText.trim()) {
            handleAnalyze(finalText);
          }
        }, 500);
      } else {
        try {
          // Check if speech recognition is available on the device
          const { available } = await SpeechRecognition.available();
          if (!available) {
            alert('您的设备未安装语音识别服务（如 Google App），无法使用此功能');
            return;
          }

          // Check permissions
          const status = await SpeechRecognition.checkPermissions();
          if (status.speechRecognition !== 'granted') {
            const reqStatus = await SpeechRecognition.requestPermissions();
            if (reqStatus.speechRecognition !== 'granted') {
              alert('请授予麦克风权限以使用语音输入');
              return;
            }
          }

          await SpeechRecognition.start({
            language: 'zh-CN',
            partialResults: true,
            popup: false,
          });
          setIsListening(true);
        } catch (e: any) {
          console.error('Native speech error:', e);
          setIsListening(false);
          // Handle specific "not connected" error commonly seen on devices without GMS
          if (e.message && e.message.includes('not connected')) {
            alert('无法连接到语音服务，请确保手机已安装 Google App 或其他语音引擎');
          } else {
            alert('语音识别启动失败: ' + (e.message || '未知错误'));
          }
        }
      }
      return;
    }

    // Web Logic
    if (!recognition) {
      // Try to initialize one last time if possible
      if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const r = new SpeechRecognition();
          r.continuous = true;
          r.interimResults = true;
          r.lang = 'zh-CN';
          r.onstart = () => setIsListening(true);
          r.onend = () => setIsListening(false);
          r.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
              alert('请允许麦克风权限');
            }
          };
          r.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            if (final) {
              setImportText(prev => prev + (prev ? ' ' : '') + final);
              setTempTranscript('');
            }
            if (interim) {
              setTempTranscript(interim);
            }
          };
          setRecognition(r);
          // Start immediately
          try {
            r.start();
          } catch (e) {
            console.error("Start error:", e);
          }
          return;
        }
      }
      alert('您的浏览器不支持语音输入，请尝试使用 Chrome 或 Safari');
      return;
    }
    if (isListening) {
      recognition.stop();
      // Auto Analyze after stopping (Web Speech updates final result in onend/onresult)
      // We rely on the fact that by the time we call analyze, the state might be updated or we need to wait
      setTimeout(() => {
        if (importTextRef.current && importTextRef.current.trim()) {
          handleAnalyze();
        }
      }, 500);
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error("Restart error:", e);
        // If start fails (e.g. already started), try to stop first then start
        try {
          recognition.stop();
          setTimeout(() => recognition.start(), 100);
        } catch (e2) {
          console.error("Retry start error:", e2);
        }
      }
    }
  };

  // Auto-select circle if none selected and circles exist
  useEffect(() => {
    if (!circleId && circles.length > 0) {
      const defaultCircle = circles.find(c => c.isDefault);
      setCircleId(defaultCircle ? defaultCircle.id : circles[0].id);
    }
  }, [circles, circleId]);

  // Load initial record data for editing
  useEffect(() => {
    if (initialRecord) {
      setAmount(Math.abs(initialRecord.amount).toString());
      setIsWin(initialRecord.amount >= 0);
      setDate(initialRecord.date);
      setCircleId(initialRecord.circleId);
      setNote(initialRecord.note || '');
    }
  }, [initialRecord]);

  const handleAnalyze = async (textOverride?: string) => {
    const textToAnalyze = textOverride !== undefined ? textOverride : importTextRef.current;

    if (!textToAnalyze.trim()) {
      alert('请输入要识别的文本');
      return;
    }

    // 检查试用次数（仅在语音模式下检查）
    if (importMode === 'voice' && !canUseVoice) {
      setShowTrialExhausted(true);
      return;
    }

    setIsAnalyzing(true);
    setParsedResults([]);
    setLastImportText(textToAnalyze);
    setFeedback(null);
    try {
      const circleNames = circles.map(c => c.name);
      const results = await analyzeText(textToAnalyze, circleNames);
      if (results.length === 0) {
        setFeedback({
          type: 'error',
          message: '未能识别到有效记录，请重新录入'
        });
        // Do NOT clear importText so user can edit it
      } else if (results.length === 1) {
        // Auto-fill for single result
        const res = results[0];
        setAmount(Math.abs(res.amount).toString());
        setIsWin(res.isWin);
        setDate(res.date);
        setNote(res.note);
        if (res.circleName) {
          const matched = circles.find(c => c.name === res.circleName);
          if (matched) setCircleId(matched.id);
        }

        setImportText('');
        setParsedResults([]);
        setShowImportModal(false);
        // 语音模式下成功识别，增加试用计数
        if (importMode === 'voice') {
          incrementUsage();
        }
      } else {
        setParsedResults(results);
        setImportText('');
        // 语音模式下成功识别多条，增加试用计数
        if (importMode === 'voice') {
          incrementUsage();
        }
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setFeedback({
        type: 'error',
        message: err.message || '识别失败，请检查网络或稍后重试'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReAnalyze = async () => {
    if (!lastImportText.trim()) return;

    setIsAnalyzing(true);
    try {
      const circleNames = circles.map(c => c.name);
      const results = await analyzeText(lastImportText, circleNames);
      if (results.length === 0) {
        setFeedback({
          type: 'error',
          message: '未能识别到有效记录，请重新录入'
        });
      } else {
        setParsedResults(results);
        setFeedback({
          type: 'info',
          message: '已重新识别'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || '识别失败，请检查网络或稍后重试'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchImport = () => {
    if (parsedResults.length === 0) return;

    // Use current circleId for all records
    // Or we could try to detect circle from text too, but for now stick to current selected circle
    const recordsToSave: Record[] = parsedResults.map(res => {
      let targetCircleId = circleId;
      // Try to match circle name
      if (res.circleName) {
        const matched = circles.find(c => c.name === res.circleName);
        if (matched) {
          targetCircleId = matched.id;
        }
      }

      return {
        id: generateId(),
        circleId: targetCircleId,
        amount: res.isWin ? Math.abs(res.amount) : -Math.abs(res.amount),
        date: res.date,
        note: res.note,
        timestamp: new Date(res.date).getTime()
      };
    });

    onSave(recordsToSave);
    setShowImportModal(false);
  };

  const removeParsedResult = (index: number) => {
    const newResults = [...parsedResults];
    newResults.splice(index, 1);
    setParsedResults(newResults);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      setError('请输入金额');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      setError('金额必须是数字');
      return;
    }

    const finalAmount = isWin ? Math.abs(numAmount) : -Math.abs(numAmount);

    const recordToSave: Record = {
      id: initialRecord ? initialRecord.id : generateId(), // Reuse ID if editing
      circleId,
      amount: finalAmount,
      date,
      note,
      timestamp: initialRecord ? initialRecord.timestamp : Date.now()
    };

    onSave(recordToSave);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and one decimal point
    if (/^\d*\.?\d*$/.test(val)) {
      setAmount(val);
      setError('');
    }
  };


  // Swipe to Back Logic
  const touchStartRef = React.useRef<{ x: number, y: number } | null>(null);
  const touchMoveRef = React.useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Only enable if starting from the left edge (e.g., first 40px)
    if (touch.clientX <= 40) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      touchStartRef.current = null;
    }
    touchMoveRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    touchMoveRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchMoveRef.current) return;

    const deltaX = touchMoveRef.current.x - touchStartRef.current.x;
    const deltaY = touchMoveRef.current.y - touchStartRef.current.y;

    // Trigger back if:
    // 1. Swiped right (positive deltaX)
    // 2. Swiped enough distance (> 80px)
    // 3. Horizontal movement is significantly larger than vertical movement (to avoid scrolling triggers)
    if (deltaX > 80 && Math.abs(deltaY) < Math.abs(deltaX) * 0.8) {
      onCancel();
    }

    // Reset
    touchStartRef.current = null;
    touchMoveRef.current = null;
  };

  return (
    <div
      className={`flex flex-col h-full ${bgClass} transition-transform duration-200`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <motion.div
        className={`flex items-center px-4 h-16 border-b ${borderClass} flex-shrink-0`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button onClick={onCancel} className={`p-2 -ml-2 ${textSecondary} hover:text-luxury-gold-500 transition-colors`}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className={`flex-1 text-center font-bold text-lg ${textPrimary}`}>
          {initialRecord ? '编辑记录' : '记一笔'}
        </h2>
        <motion.button
          onClick={() => {
            setImportMode('batch');
            setShowImportModal(true);
          }}
          className="p-2 -mr-2 text-luxury-gold-500 flex items-center space-x-1"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-sm font-bold">批量导入</span>
          <Sparkles className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* 语音记账入口提示 - 仅在非编辑模式下显示 */}
      {!initialRecord && (
        <motion.div
          className={`mx-4 mt-3 px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer ${isDarkTheme ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}
          onClick={() => {
            if (!canUseVoice) {
              setShowTrialExhausted(true);
              return;
            }
            setImportMode('voice');
            setAutoStartVoice(true);
            setShowImportModal(true);
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkTheme ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Mic className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-amber-400' : 'text-amber-700'}`}>
                🎤 {canUseVoice
                  ? (isPro ? `AI 语音记账 (今日剩余 ${remaining} 次)` : `AI 语音记账 (剩余 ${remaining} 次试用)`)
                  : (isPro ? 'AI 语音记账 (今日次数已用完)' : 'AI 语音记账 (试用已用完)')
                }
              </p>
              <p className={`text-xs ${isDarkTheme ? 'text-amber-500/70' : 'text-amber-600/70'}`}>
                {canUseVoice
                  ? '直接说出战绩，或在首页长按 ➕ 按钮进入'
                  : (isPro ? '今日额度已用完，明天再来' : '升级到 Pro 解锁无限使用')
                }
              </p>
            </div>
          </div>
          {canUseVoice ? (
            <ChevronLeft className={`w-5 h-5 rotate-180 ${isDarkTheme ? 'text-amber-500/50' : 'text-amber-400'}`} />
          ) : (
            <Crown className={`w-5 h-5 ${isDarkTheme ? 'text-amber-500' : 'text-amber-500'}`} />
          )}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">

        {/* Compact Layout */}
        <motion.div
          className="flex flex-col space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >

          {/* Row 1: Circle & Date (Secondary Info) */}
          <div className="flex items-center space-x-4">
            {/* Circle Selector - Compact */}
            <div className="flex-1 min-w-0">
              <label className={`text-xs ${textSecondary} mb-2 block pl-1 uppercase tracking-wider`}>圈子</label>
              <div className="flex overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 space-x-2">
                {circles.map((c, index) => (
                  <motion.button
                    key={c.id}
                    type="button"
                    onClick={() => setCircleId(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap border transition-all font-medium ${circleId === c.id
                      ? 'bg-luxury-gold-500/20 border-luxury-gold-500 text-luxury-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                      : `${inputBg} ${borderClass} ${textSecondary} hover:border-luxury-gold-500/30`
                      }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {c.name}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Date Picker - Compact */}
            <div className="flex-none">
              <label className={`text-xs ${textSecondary} mb-2 block pl-1 uppercase tracking-wider`}>日期</label>
              <motion.input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`py-2 px-4 ${inputBg} rounded-xl ${borderClass} text-xs text-center font-medium outline-none focus:border-luxury-gold-500/50 focus:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all ${textPrimary}`}
                whileFocus={{ scale: 1.02 }}
              />
            </div>
          </div>

          {/* Row 2: Win/Loss & Amount (Primary Input) */}
          <motion.div
            className="flex items-stretch space-x-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Win/Loss Switch - Pill Shape */}
            <div className={`flex flex-col flex-none justify-center ${inputBg} rounded-2xl p-1.5 w-24 border ${borderClass}`}>
              <motion.button
                type="button"
                onClick={() => {
                  setIsWin(true);
                  amountInputRef.current?.focus();
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all mb-1 ${isWin
                  ? 'bg-win-crimson text-white shadow-[0_0_20px_rgba(220,20,60,0.4)]'
                  : `${textSecondary} hover:text-win-crimson/70`
                  }`}
                whileHover={{ scale: isWin ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                赢
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setIsWin(false);
                  amountInputRef.current?.focus();
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${!isWin
                  ? 'bg-loss-emerald text-white shadow-[0_0_20px_rgba(0,200,83,0.4)]'
                  : `${textSecondary} hover:text-loss-emerald/70`
                  }`}
                whileHover={{ scale: !isWin ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                输
              </motion.button>
            </div>

            {/* Amount Input - Prominent */}
            <div className="flex-1 relative group">
              <span
                className={`absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-bold font-mono-numeric transition-colors ${isWin ? 'text-win-crimson drop-shadow-[0_0_15px_rgba(220,20,60,0.5)]' : 'text-loss-emerald drop-shadow-[0_0_15px_rgba(0,200,83,0.5)]'
                  }`}
              >
                ¥
              </span>
              <motion.input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                className={`w-full h-full text-right pr-5 py-4 pl-14 ${inputBg} rounded-2xl text-5xl font-bold outline-none border-2 transition-all font-mono-numeric ${error
                  ? 'border-rose-500/50 text-rose-500'
                  : `${borderClass} focus:${isWin ? 'border-win-crimson' : 'border-loss-emerald'}/50 focus:shadow-[0_0_30px_rgba(${isWin ? '220,20,60' : '0,200,83'},0.2)] ${isWin ? 'text-win-crimson' : 'text-loss-emerald'}`
                  } ${textPrimary} placeholder:text-slate-300`}
                autoFocus={!initialRecord}
                whileFocus={{ scale: 1.01 }}
              />
            </div>
          </motion.div>

          {/* Row 3: Note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`}>
                <FileText className="w-5 h-5" />
              </div>
              <motion.input
                type="text"
                placeholder="备注 (选填)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={20}
                className={`w-full py-4 pl-12 pr-12 ${inputBg} rounded-xl ${borderClass} text-sm outline-none focus:border-luxury-gold-500/50 focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all ${textPrimary} placeholder:text-slate-400`}
                whileFocus={{ scale: 1.01 }}
              />
              <motion.button
                type="button"
                onClick={() => {
                  setImportMode('voice');
                  setShowImportModal(true);
                  toggleListening();
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${textSecondary} hover:text-luxury-gold-500 hover:bg-luxury-gold-500/10 transition-colors`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Mic size={20} />
              </motion.button>
            </div>
          </motion.div>

        </motion.div>

        {/* Spacer to account for fixed footer */}
        <div style={{ height: keyboardHeight > 0 ? keyboardHeight + 80 : 80 }}></div>
      </form>

      {/* Fixed Footer with Submit Button - 固定在底部，键盘弹出时上移 */}
      <motion.div
        className={`fixed left-0 right-0 p-4 border-t ${borderClass} ${bgClass} z-50 max-w-md mx-auto`}
        style={{ bottom: keyboardHeight > 0 ? keyboardHeight : 0 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          onClick={(e) => handleSubmit(e as any)}
          className={`w-full font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center transition-all ${isWin
            ? 'bg-win-crimson text-white shadow-[0_0_30px_rgba(220,20,60,0.4)] hover:shadow-[0_0_40px_rgba(220,20,60,0.5)]'
            : 'bg-loss-emerald text-white shadow-[0_0_30px_rgba(0,200,83,0.4)] hover:shadow-[0_0_40px_rgba(0,200,83,0.5)]'
            }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="w-5 h-5 mr-2" /> {initialRecord ? '更新记录' : '保存'}
        </motion.button>
      </motion.div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={`${bgSecondary} w-full max-w-sm rounded-3xl p-6 flex flex-col space-y-4 shadow-2xl ${borderClass}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="flex justify-between items-center">
                <h3 className={`font-bold text-lg ${textPrimary} flex items-center`}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5 mr-2 text-luxury-gold-500" />
                  </motion.div>
                  {importMode === 'voice' ? '语音记账' : '批量导入'}
                  {/* 语音模式显示剩余次数 */}
                  {importMode === 'voice' && (
                    <span className="ml-2 text-xs font-normal bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                      {isPro ? `今日剩余 ${remaining} 次` : `剩余 ${remaining} 次`}
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <motion.button
                    onClick={handleReAnalyze}
                    disabled={isAnalyzing}
                    className={`p-2 rounded-full hover:bg-luxury-gold-500/10 ${textSecondary} hover:text-luxury-gold-500 transition-colors ${isAnalyzing ? 'animate-spin' : ''
                      }`}
                    title="重新识别"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <RefreshCw size={20} />
                  </motion.button>
                  <motion.button
                    onClick={handleUserCloseModal}
                    className={`${textSecondary} hover:${textPrimary} transition-colors`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
              </div>

              {parsedResults.length > 0 ? (
                <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] space-y-3">
                  <motion.p
                    className="text-sm text-loss-emerald font-bold"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    成功识别 {parsedResults.length} 条记录：
                  </motion.p>
                  {parsedResults.map((res, idx) => (
                    <motion.div
                      key={idx}
                      className={`${inputBg} p-4 rounded-xl ${borderClass} relative group`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold font-mono-numeric ${res.isWin ? 'text-win-crimson drop-shadow-[0_0_10px_rgba(220,20,60,0.3)]' : 'text-loss-emerald drop-shadow-[0_0_10px_rgba(0,200,83,0.3)]'
                              }`}>
                              {res.isWin ? '+' : '-'}{res.amount}
                            </span>
                            <span className={`text-xs ${textSecondary}`}>{res.date}</span>
                            {res.circleName && (
                              <span className="text-[10px] bg-luxury-gold-500/10 text-luxury-gold-500 px-2 py-0.5 rounded border border-luxury-gold-500/20">
                                {res.circleName}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${textSecondary} mt-1`}>{res.note || '无备注'}</p>
                        </div>
                        <motion.button
                          onClick={() => removeParsedResult(idx)}
                          className={`${textSecondary} hover:text-rose-500 p-1 transition-colors`}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col">
                  <label className={`text-sm ${textSecondary} block`}>
                    {importMode === 'voice' ? '语音输入' : '粘贴文本'}
                    <span className={`text-xs ${textSecondary}/80 ml-2`}>(支持时间、金额、输赢、圈子)</span>
                  </label>
                  <div className="relative flex-1">
                    {importMode === 'batch' ? (
                      <textarea
                        className={`w-full h-full min-h-[120px] p-4 ${inputBg} rounded-xl ${borderClass} resize-none text-sm focus:border-luxury-gold-500/50 focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] outline-none transition-all ${textPrimary} placeholder:text-slate-400`}
                        placeholder="请粘贴多条记录，例如：
'昨天在雀神会打麻将赢了200'
'周五和朋友斗地主输了50'"
                        value={importText}
                        onChange={(e) => {
                          setImportText(e.target.value);
                          setFeedback(null); // Clear feedback on user input
                        }}
                      />
                    ) : (
                      <div className="w-full h-full min-h-[120px] bg-luxury-gold-500/5 rounded-xl border border-luxury-gold-500/20 flex flex-col items-center justify-center relative overflow-hidden">
                        {tempTranscript || importText ? (
                          <div className={`w-full h-full p-4 overflow-y-auto text-center text-lg font-medium ${textPrimary} flex items-center justify-center`}>
                            "{tempTranscript || importText}"
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                            <p className="text-luxury-gold-500 font-medium">
                              {isListening ? '正在聆听...' : '点击下方按钮开始说话'}
                            </p>
                          </div>
                        )}

                        {/* Voice Wave Animation when listening */}
                        {isListening && (
                          <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute inset-0 flex items-center justify-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-2 bg-luxury-gold-500 rounded-full"
                                  animate={{ scaleY: [0.5, 1.5, 0.5] }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut"
                                  }}
                                  style={{ height: '40%' }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Voice Input Button Centered */}
                        <motion.button
                          type="button"
                          onClick={toggleListening}
                          className={`mt-4 p-4 rounded-full shadow-xl transition-all ${isListening
                            ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                            : 'bg-luxury-gold-500 text-dark-bg-primary hover:bg-luxury-gold-400 shadow-[0_0_30px_rgba(212,175,55,0.3)]'
                            }`}
                          title={isListening ? "停止录音" : "开始语音输入"}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {/* Feedback Message */}
                  {feedback && !isListening && (
                    <motion.div
                      className={`text-sm text-center p-3 rounded-xl ${feedback.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-luxury-gold-500/10 text-luxury-gold-500 border border-luxury-gold-500/20'
                        }`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {feedback.message}
                    </motion.div>
                  )}

                  {isListening && (
                    <motion.p
                      className="text-xs text-center text-luxury-gold-500 font-medium"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      正在聆听... (说完后请再次点击按钮停止)
                    </motion.p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {parsedResults.length > 0 && (
                  <motion.button
                    onClick={() => {
                      setParsedResults([]);
                      setImportText('');
                    }}
                    className={`flex-1 ${inputBg} hover:opacity-80 ${textSecondary} py-3 rounded-xl font-bold transition-all ${borderClass}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    重置
                  </motion.button>
                )}

                <motion.button
                  onClick={parsedResults.length > 0 ? handleBatchImport : () => handleAnalyze()}
                  disabled={isAnalyzing}
                  className="flex-1 bg-gold-gradient text-dark-bg-primary py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-gold-glow hover:shadow-gold-ghover"
                  whileHover={{ scale: isAnalyzing ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center">
                        <Loader2 className="animate-spin mr-2 w-5 h-5" />
                        AI 分析中...
                      </div>
                      {importMode === 'batch' && (
                        <span className="text-[10px] font-normal opacity-80 mt-1">
                          批量分析可能需要 1 分钟左右，请耐心等待...
                        </span>
                      )}
                    </div>
                  ) : parsedResults.length > 0 ? (
                    <>
                      <Check className="mr-2 w-5 h-5" />
                      全部导入
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 w-5 h-5" />
                      开始识别
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trial Exhausted Modal */}
      <TrialExhaustedModal
        isOpen={showTrialExhausted}
        onClose={() => setShowTrialExhausted(false)}
      />
    </div>
  );
};

export default AddRecord;
