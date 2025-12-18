import React, { useState, useEffect } from 'react';
import { ChevronLeft, Send, Mic, MicOff, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { ViewState } from '../types';

interface FeedbackProps {
  onNavigate: (view: ViewState) => void;
  userId?: string;
}

const Feedback: React.FC<FeedbackProps> = ({ onNavigate, userId }) => {
  const [content, setContent] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const { 
    isListening, 
    transcript, 
    start, 
    stop, 
    resetTranscript, 
    error: voiceError 
  } = useVoiceInput();

  // Append voice transcript to content
  useEffect(() => {
    if (transcript) {
      // Logic to append: if content ends with punctuation or space, just append. 
      // Otherwise add space.
      // But simpler: just append and let user edit.
      // We need to be careful not to double-append if transcript updates partially.
      // The hook currently returns "accumulated session transcript" or "final segments".
      // Our simple hook appends final results to its internal state.
      
      // Better UX: When voice stops, we commit the transcript to main content and clear hook's transcript.
      // But we want real-time feedback.
      // Let's rely on the user stopping, OR update in real-time.
      // If we update real-time, we need to know what part is "new".
      // The hook provides `transcript` which accumulates.
      // So we can just show `content + (isListening ? transcript : '')` ?
      // No, because `transcript` in our hook persists until reset.
      
      // Let's try this: 
      // While listening, show transcript in a separate "preview" or just let it accumulate in the hook 
      // and when stopped, append it.
      // actually, let's just use the effect to append "final" results if the hook supports it.
      // But our hook aggregates everything into `transcript`.
      
      // Strategy: 
      // 1. When `isListening` becomes false, append `transcript` to `content` and call `resetTranscript`.
    }
  }, [transcript]); // This dependency is too frequent if we are not careful.

  // Let's change strategy:
  // We will display `transcript` in a "Listening..." overlay or floating bubble, 
  // and when stopped, we append it to `content`.
  
  useEffect(() => {
    if (!isListening && transcript) {
      setContent(prev => {
        const separator = prev.trim() && !/[，。！？\n]$/.test(prev.trim()) ? '，' : '';
        return prev + separator + transcript;
      });
      resetTranscript();
    }
  }, [isListening, transcript, resetTranscript]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Ensure we have a valid user ID, preferring the one from auth state if possible
      let finalUserId = userId;
      if (!finalUserId) {
         const { data } = await supabase.auth.getUser();
         finalUserId = data.user?.id;
      }

      if (!finalUserId) {
        throw new Error('无法获取用户信息，请尝试重新登录');
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: finalUserId,
        content: content.trim(),
        contact_info: contactInfo.trim() || null,
      });

      if (error) throw error;

      setSubmitStatus('success');
      setContent('');
      setContactInfo('');
      
      // Auto go back after success
      setTimeout(() => {
        onNavigate(ViewState.SETTINGS);
      }, 2000);

    } catch (err: any) {
      console.error('Feedback submit error:', err);
      setSubmitStatus('error');
      setErrorMessage(err.message || '提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center px-4 h-14 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => onNavigate(ViewState.SETTINGS)} className="p-2 -ml-2 text-gray-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center font-bold text-lg text-gray-800">意见反馈</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {submitStatus === 'success' ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Send className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">感谢您的反馈！</h3>
            <p className="text-gray-500">我们会认真阅读每一条建议，努力做得更好。</p>
            <button 
              onClick={() => onNavigate(ViewState.SETTINGS)}
              className="mt-8 text-mahjong-600 font-bold hover:underline"
            >
              返回设置
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 flex items-center justify-between">
                <span>反馈内容</span>
                {isListening && <span className="text-indigo-600 text-xs animate-pulse">正在听...</span>}
              </label>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请详细描述您遇到的问题或建议..."
                  className="w-full h-40 p-4 bg-gray-50 rounded-xl border border-gray-200 resize-none outline-none focus:ring-2 focus:ring-mahjong-500/20 text-base"
                  disabled={isSubmitting}
                />
                
                {/* Voice Button */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`absolute right-3 bottom-3 p-2 rounded-full transition-all shadow-sm ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-white text-gray-500 hover:text-indigo-600 border border-gray-200'
                  }`}
                  title="语音输入"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Voice Transcript Preview */}
              {isListening && transcript && (
                <div className="bg-indigo-50 p-3 rounded-lg text-sm text-indigo-800 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                  <p className="font-bold text-xs mb-1">识别中:</p>
                  {transcript}
                </div>
              )}
              
              {voiceError && (
                <p className="text-xs text-red-500 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {voiceError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">联系方式 (选填)</label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="邮箱或手机号，方便我们联系您"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-mahjong-500/20"
                disabled={isSubmitting}
              />
            </div>

            {submitStatus === 'error' && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full bg-mahjong-600 hover:bg-mahjong-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-mahjong-500/30 active:scale-[0.98] transition-all flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  提交反馈
                </>
              )}
            </button>
            
            <p className="text-center text-xs text-gray-400">
              您的反馈将帮助我们不断改进产品体验
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Feedback;
