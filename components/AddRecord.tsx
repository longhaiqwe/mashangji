
import React, { useState, useEffect } from 'react';
import { Circle, Record } from '../types';
import { ChevronLeft, Calendar, FileText, Check, Users, Sparkles, X, Loader2, Trash2, RefreshCw, Mic, MicOff } from 'lucide-react';
import { generateId } from '../services/storageService';
import { analyzeText, ParsedRecord } from '../services/geminiService';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

type ImportMode = 'batch' | 'voice';

interface AddRecordProps {
  circles: Circle[];
  onSave: (record: Record | Record[]) => void;
  onCancel: () => void;
  initialCircleId?: string;
  initialRecord?: Record | null; // For editing
  initialAutoStartVoice?: boolean;
}

const AddRecord: React.FC<AddRecordProps> = ({ circles, onSave, onCancel, initialCircleId, initialRecord, initialAutoStartVoice = false }) => {
  const [amount, setAmount] = useState<string>('');
  const [isWin, setIsWin] = useState<boolean>(true);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [circleId, setCircleId] = useState<string>(initialCircleId || (circles[0]?.id || ''));
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  // AI Import State
  const [showImportModal, setShowImportModal] = useState(initialAutoStartVoice);
  const [importMode, setImportMode] = useState<ImportMode>(initialAutoStartVoice ? 'voice' : 'batch');
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParsedRecord[]>([]);
  const [feedback, setFeedback] = useState<{type: 'error' | 'info', message: string} | null>(null);

  // Keep track of the original text for re-analysis
  const [lastImportText, setLastImportText] = useState('');

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [tempTranscript, setTempTranscript] = useState('');
  const [autoStartVoice, setAutoStartVoice] = useState(initialAutoStartVoice);
  
  // Ref to keep track of latest importText for async operations
  const importTextRef = React.useRef(importText);
  useEffect(() => {
    importTextRef.current = importText;
  }, [importText]);

  // Sync prop to state to handle re-navigation/long-press when component is already mounted
  useEffect(() => {
    if (initialAutoStartVoice) {
        setImportMode('voice');
        setAutoStartVoice(true);
        setShowImportModal(true);
    }
  }, [initialAutoStartVoice]);

  const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
        SpeechRecognition.stop().catch(() => {});
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
        SpeechRecognition.stop().catch(() => {});
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
            await SpeechRecognition.stop();
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
            } catch (e) {
                console.error('Native speech error:', e);
                setIsListening(false);
                alert('语音识别启动失败');
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
      if(!circleId && circles.length > 0) {
          setCircleId(circles[0].id);
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
      } else {
        setParsedResults(results);
        setImportText('');
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center px-4 h-14 border-b border-gray-100 flex-shrink-0">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center font-bold text-lg text-gray-800">
            {initialRecord ? '编辑记录' : '记一笔'}
        </h2>
        <button onClick={() => {
            setImportMode('batch');
            setShowImportModal(true);
        }} className="p-2 -mr-2 text-indigo-600 flex items-center space-x-1">
           <span className="text-sm font-bold">批量导入</span>
           <Sparkles className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        
        {/* Amount Input Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex w-full bg-gray-100 rounded-lg p-1">
             <button 
                type="button"
                onClick={() => setIsWin(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isWin ? 'bg-white text-win shadow-sm' : 'text-gray-400'}`}
             >
                赢了
             </button>
             <button 
                type="button"
                onClick={() => setIsWin(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isWin ? 'bg-white text-loss shadow-sm' : 'text-gray-400'}`}
             >
                输了
             </button>
          </div>

          <div className="relative w-full">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold ${isWin ? 'text-win' : 'text-loss'}`}>¥</span>
            <input 
              type="text" 
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              className={`w-full text-right pr-14 py-4 bg-gray-50 rounded-2xl text-4xl font-bold outline-none border-2 transition-colors ${error ? 'border-red-300' : 'border-transparent focus:border-mahjong-500'} ${isWin ? 'text-win' : 'text-loss'}`}
              autoFocus={!initialRecord} // Don't auto-focus on edit to avoid jarring jump on mobile
            />
            <button
                type="button"
                onClick={() => {
                    setImportMode('voice');
                    setShowImportModal(true);
                    // Don't rely on autoStartVoice effect for local interaction to avoid User Gesture loss
                    // Start listening immediately
                    toggleListening();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="语音记账"
            >
                <Mic size={24} />
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Details Form */}
        <div className="space-y-4 pt-4">
          
          {/* Circle Selector */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-500">
              <Users className="w-4 h-4 mr-2" /> 圈子
            </label>
            <div className="flex flex-wrap gap-2">
              {circles.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCircleId(c.id)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${circleId === c.id ? 'bg-mahjong-50 border-mahjong-500 text-mahjong-700 font-bold' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  {c.name}
                </button>
              ))}
              {/* Fallback if no circles */}
              {circles.length === 0 && <span className="text-xs text-red-400">请先去圈子管理添加圈子</span>}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-500">
               <Calendar className="w-4 h-4 mr-2" /> 日期
            </label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 outline-none focus:ring-2 focus:ring-mahjong-500/20"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-500">
               <FileText className="w-4 h-4 mr-2" /> 备注 (选填)
            </label>
            <input 
              type="text" 
              placeholder="记录一下今天的手气..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={20}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 outline-none focus:ring-2 focus:ring-mahjong-500/20"
            />
          </div>

        </div>

        <div className="flex-1"></div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-mahjong-600 hover:bg-mahjong-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-mahjong-500/30 active:scale-[0.98] transition-all flex items-center justify-center"
        >
          <Check className="w-5 h-5 mr-2" /> {initialRecord ? '更新记录' : '保存'}
        </button>
      </form>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-indigo-500"/> 
                {importMode === 'voice' ? '语音记账' : '批量导入'}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReAnalyze}
                  disabled={isAnalyzing}
                  className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors ${isAnalyzing ? 'animate-spin' : ''}`}
                  title="重新识别"
                >
                  <RefreshCw size={20} />
                </button>
                <button onClick={handleUserCloseModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {parsedResults.length > 0 ? (
              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] space-y-3">
                 <p className="text-sm text-green-600 font-bold">成功识别 {parsedResults.length} 条记录：</p>
                 {parsedResults.map((res, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className={`font-bold ${res.isWin ? 'text-win' : 'text-loss'}`}>
                                        {res.isWin ? '+' : '-'}{res.amount}
                                    </span>
                                    <span className="text-xs text-gray-400">{res.date}</span>
                                    {res.circleName && (
                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                                            {res.circleName}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{res.note || '无备注'}</p>
                            </div>
                            <button 
                                onClick={() => removeParsedResult(idx)}
                                className="text-gray-400 hover:text-red-500 p-1"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                 ))}
              </div>
            ) : (
                <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-sm text-gray-500 block">
                        {importMode === 'voice' ? '语音输入' : '粘贴文本'}
                        <span className="text-xs text-gray-400 ml-2">(支持时间、金额、输赢、圈子)</span>
                    </label>
                    <div className="relative flex-1">
                        {importMode === 'batch' ? (
                            <textarea
                                className="w-full h-full min-h-[120px] p-3 bg-gray-50 rounded-xl border border-gray-200 resize-none text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
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
                            <div className="w-full h-full min-h-[120px] bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center relative overflow-hidden">
                                {tempTranscript || importText ? (
                                    <div className="w-full h-full p-4 overflow-y-auto text-center text-lg font-medium text-gray-700 flex items-center justify-center">
                                        "{tempTranscript || importText}"
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <p className="text-indigo-600 font-medium">
                                            {isListening ? '正在聆听...' : '点击下方按钮开始说话'}
                                        </p>
                                    </div>
                                )}
                                
                                {/* Voice Wave Animation when listening */}
                                {isListening && (
                                    <div className="absolute inset-0 pointer-events-none opacity-10">
                                        <div className="absolute inset-0 flex items-center justify-center space-x-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="w-2 bg-indigo-600 rounded-full animate-bounce" style={{ height: '40%', animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Voice Input Button Centered */}
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`mt-4 p-4 rounded-full shadow-xl transition-all ${
                                        isListening 
                                        ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-500/30' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-indigo-500/30'
                                    }`}
                                    title={isListening ? "停止录音" : "开始语音输入"}
                                >
                                    {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Feedback Message */}
                    {feedback && !isListening && (
                        <div className={`text-sm text-center p-2 rounded-lg animate-in fade-in slide-in-from-top-1 ${feedback.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {feedback.message}
                        </div>
                    )}

                    {isListening && (
                        <p className="text-xs text-center text-indigo-600 font-medium animate-pulse">
                            正在聆听... (说完后请再次点击按钮停止)
                        </p>
                    )}
                </div>
            )}

            <div className="flex gap-3">
                {parsedResults.length > 0 && (
                    <button
                        onClick={() => {
                            setParsedResults([]);
                            setImportText('');
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition-all"
                    >
                        重置
                    </button>
                )}
                
                <button
                onClick={parsedResults.length > 0 ? handleBatchImport : () => handleAnalyze()}
                disabled={isAnalyzing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30"
                >
                {isAnalyzing ? (
                    <div className="flex flex-col items-center">
                        <div className="flex items-center">
                            <Loader2 className="animate-spin mr-2 w-5 h-5"/>
                            AI 分析中...
                        </div>
                        {importMode === 'batch' && (
                            <span className="text-[10px] font-normal opacity-80 mt-1">
                                批量分析可能需要 1～2 分钟左右，请耐心等待...
                            </span>
                        )}
                    </div>
                ) : parsedResults.length > 0 ? (
                    <>
                    <Check className="mr-2 w-5 h-5"/>
                    全部导入
                    </>
                ) : (
                    <>
                    <Sparkles className="mr-2 w-5 h-5"/>
                    开始识别
                    </>
                )}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRecord;
