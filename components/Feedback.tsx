import React, { useState, useEffect } from 'react';
import { ChevronLeft, Send, Mic, MicOff, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { ViewState } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface FeedbackProps {
  onNavigate: (view: ViewState) => void;
  userId?: string;
  themeId?: string;
}

const Feedback: React.FC<FeedbackProps> = ({ onNavigate, userId, themeId = 'default' }) => {
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

  // Theme Styles
  const isDarkTheme = themeId === 'black' || themeId === 'rich';
  const bgClass = isDarkTheme ? 'bg-dark-bg-primary' : 'bg-light-bg-primary';
  const headerBg = isDarkTheme ? 'bg-dark-bg-secondary/70 border-luxury-gold-500/10' : 'bg-white/80 border-slate-200';
  const textPrimary = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const cardVariant = isDarkTheme ? 'glass' : 'light';
  const inputClass = isDarkTheme
    ? 'bg-dark-bg-tertiary/70 border-luxury-gold-500/20 text-white placeholder:text-slate-500 focus:border-luxury-gold-500/50'
    : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-luxury-gold-500/60';
  const hintChip = isDarkTheme
    ? 'bg-white/5 text-slate-300 border-white/10'
    : 'bg-slate-50 text-slate-500 border-slate-200';
  const voiceChip = isDarkTheme
    ? 'bg-win-crimson/15 text-win-crimson border-win-crimson/30'
    : 'bg-rose-50 text-rose-600 border-rose-200';
  const successChip = isDarkTheme
    ? 'bg-luxury-gold-500/10 text-luxury-gold-400 border-luxury-gold-500/30'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  const errorChip = isDarkTheme
    ? 'bg-win-crimson/15 text-win-crimson border-win-crimson/30'
    : 'bg-rose-50 text-rose-600 border-rose-200';

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
    <div className={`flex flex-col h-full ${bgClass} relative overflow-hidden`}>
      {/* Ambient background glow */}
      <div className={`absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl ${isDarkTheme ? 'bg-luxury-gold-500/10' : 'bg-amber-200/40'}`} />
      <div className={`absolute -bottom-28 -left-16 w-72 h-72 rounded-full blur-3xl ${isDarkTheme ? 'bg-win-crimson/10' : 'bg-rose-200/40'}`} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className={`safe-top px-6 pb-4 flex-shrink-0 sticky top-0 z-20 backdrop-blur-xl border-b ${headerBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => onNavigate(ViewState.SETTINGS)}
                className={`p-2 -ml-2 mr-2 rounded-full transition-all ${isDarkTheme ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className={`text-xl font-display tracking-tight ${textPrimary}`}>意见反馈</h2>
                <p className={`text-xs mt-0.5 ${textSecondary}`}>我们会认真阅读每条建议</p>
              </div>
            </div>
            <div className="w-10" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 safe-bottom">
          {submitStatus === 'success' ? (
            <div className="h-full flex items-center justify-center">
              <Card variant={cardVariant} size="lg" hover={false} className="text-center max-w-[360px] mx-auto">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 border ${successChip}`}>
                  <Send className="w-8 h-8" />
                </div>
                <h3 className={`text-xl font-bold ${textPrimary}`}>感谢您的反馈！</h3>
                <p className={`text-sm mt-2 ${textSecondary}`}>我们会认真阅读每一条建议，持续优化体验。</p>
                <div className="mt-6">
                  <Button variant="secondary" size="md" onClick={() => onNavigate(ViewState.SETTINGS)}>
                    返回设置
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Card variant={cardVariant} size="sm" hover={false}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-sm font-bold ${textPrimary}`}>反馈内容</label>
                  {isListening && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${voiceChip} animate-pulse`}>
                      正在听...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="请详细描述您遇到的问题或建议..."
                    className={`w-full h-36 p-4 rounded-2xl border resize-none outline-none transition-colors ${inputClass}`}
                    disabled={isSubmitting}
                  />

                  {/* Voice Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-all shadow-sm border ${isListening
                      ? 'bg-win-crimson text-white border-win-crimson/30 animate-pulse'
                      : isDarkTheme
                        ? 'bg-white/5 text-slate-300 border-white/10 hover:text-luxury-gold-400'
                        : 'bg-white text-slate-500 border-slate-200 hover:text-amber-600'
                      }`}
                    title="语音输入"
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>

                {/* Voice Transcript Preview */}
                {isListening && transcript && (
                  <div className={`mt-3 p-3 rounded-2xl border text-sm ${isDarkTheme ? 'bg-white/5 text-slate-200 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'
                    } animate-in fade-in slide-in-from-top-2`}>
                    <p className="font-bold text-xs mb-1">识别中:</p>
                    {transcript}
                  </div>
                )}

                {voiceError && (
                  <div className={`mt-3 text-xs flex items-center border rounded-xl px-3 py-2 ${errorChip}`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {voiceError}
                  </div>
                )}
              </Card>

              <Card variant={cardVariant} size="sm" hover={false}>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>联系方式 (选填)</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="邮箱或手机号，方便我们联系您"
                  className={`w-full p-3 rounded-2xl border outline-none transition-colors ${inputClass}`}
                  disabled={isSubmitting}
                />
              </Card>

              {submitStatus === 'error' && (
                <div className={`p-3 text-sm rounded-2xl border flex items-center ${errorChip}`}>
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting || !content.trim()}
                icon={!isSubmitting ? <Send className="w-5 h-5" /> : undefined}
              >
                {isSubmitting ? '提交中...' : '提交反馈'}
              </Button>

              <p className={`text-center text-xs ${textSecondary}`}>
                您的反馈将帮助我们不断改进产品体验
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;
