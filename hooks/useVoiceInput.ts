import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface UseVoiceInputResult {
  isListening: boolean;
  transcript: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  resetTranscript: () => void;
  error: string | null;
  hasPermission: boolean | null;
}

interface UseVoiceInputOptions {
  silenceTimeout?: number;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}): UseVoiceInputResult => {
  const { silenceTimeout = 2000 } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Refs to handle cleanup and stale closures
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop ref to access inside timeouts/callbacks without dependency cycles
  const stopRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    // Check permissions on mount
    const checkPerms = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await SpeechRecognition.checkPermissions();
          setHasPermission(status.speechRecognition === 'granted');
        } catch (e) {
          console.error('Error checking speech permissions:', e);
        }
      } else {
        // Web is usually prompt-on-use, assume true or null
        setHasPermission(true);
      }
    };
    checkPerms();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.removeAllListeners();
        SpeechRecognition.stop().catch(() => {});
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const stop = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        // Remove listeners first to prevent any trailing results from updating state
        await SpeechRecognition.removeAllListeners();
        await SpeechRecognition.stop();
      } catch (e) {
        console.error('Native stop error:', e);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
    setIsListening(false);
  }, []);

  // Update stopRef whenever stop changes
  useEffect(() => {
      stopRef.current = stop;
  }, [stop]);

  const resetSilenceTimer = useCallback(() => {
      if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
      }
      
      silenceTimerRef.current = setTimeout(() => {
          console.log('Silence detected, auto stopping...');
          stopRef.current();
      }, silenceTimeout);
  }, [silenceTimeout]);

  const start = useCallback(async () => {
    setError(null);
    // Clear any previous silence timer
    if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        // Check/Request Permissions
        const status = await SpeechRecognition.checkPermissions();
        if (status.speechRecognition !== 'granted') {
          const reqStatus = await SpeechRecognition.requestPermissions();
          if (reqStatus.speechRecognition !== 'granted') {
            setError('未获得麦克风权限');
            setHasPermission(false);
            return;
          }
          setHasPermission(true);
        }

        // Setup Listeners
        await SpeechRecognition.removeAllListeners();
        
        await SpeechRecognition.addListener('partialResults', (data: any) => {
            if (data.matches && data.matches.length > 0) {
                // Native usually returns accumulated text for the session
                setTranscript(data.matches[0]);
                // Reset silence timer on any result
                resetSilenceTimer();
            }
        });

        await SpeechRecognition.start({
          language: 'zh-CN',
          partialResults: true,
          popup: false,
        });
        
        setIsListening(true);
      } catch (e: any) {
        console.error('Native speech start error:', e);
        setError('语音识别启动失败: ' + (e.message || '未知错误'));
        setIsListening(false);
      }
    } else {
      // Web API
      if (typeof window === 'undefined') return;
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError('您的浏览器不支持语音输入');
        return;
      }

      try {
        const r = new SpeechRecognition();
        r.continuous = true;
        r.interimResults = true;
        r.lang = 'zh-CN';

        r.onstart = () => setIsListening(true);
        r.onend = () => setIsListening(false);
        r.onerror = (event: any) => {
           console.error('Web Speech error:', event.error);
           setError('语音识别错误: ' + event.error);
           setIsListening(false);
        };

        r.onresult = (event: any) => {
          // Reset silence timer on ANY result (interim or final)
          resetSilenceTimer();

          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            }
          }
          
          if (final) {
            setTranscript(prev => prev + final);
          }
        };

        recognitionRef.current = r;
        r.start();
      } catch (e: any) {
        console.error('Web speech start error:', e);
        setError('启动失败: ' + e.message);
      }
    }
  }, [resetSilenceTimer]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    start,
    stop,
    resetTranscript,
    error,
    hasPermission
  };
};
