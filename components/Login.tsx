
import React, { useState, useEffect } from 'react';
import { Dice5, ArrowRight, Lock, User as UserIcon, Mail } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputPadding = isRegistering ? 'py-3.5' : 'py-4';

  // 监听键盘高度变化
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const willShowListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
    });

    const willHideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      willShowListener.then(handle => handle.remove());
      willHideListener.then(handle => handle.remove());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      return;
    }

    if (isRegistering) {
      if (!username.trim()) {
        setError('请输入用户名');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次密码输入不一致');
        return;
      }
    }

    setLoading(true);
    try {
      let user: User;
      if (isRegistering) {
        user = await authService.register(email.trim(), password.trim(), username.trim());
      } else {
        user = await authService.login(email.trim(), password.trim());
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div
      className="flex flex-col items-center justify-start h-[100dvh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-x-none relative transition-all duration-300 bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(244,228,188,0.7),transparent_45%),radial-gradient(900px_circle_at_85%_0%,rgba(212,175,55,0.25),transparent_40%),linear-gradient(180deg,#FFFDF7_0%,#F7F1E6_100%)]"
    >
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-12%] left-[-12%] w-[520px] h-[520px] bg-luxury-gold-300/30 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-12%] right-[-12%] w-[440px] h-[440px] bg-luxury-gold-500/15 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
      <div className="absolute inset-0 opacity-40 pointer-events-none [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(212,175,55,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(212,175,55,0.08)_1px,transparent_1px)] bg-[size:28px_28px]"></div>
      </div>

      {/* Card Container - 键盘弹出时向上移动 */}
      <div
        className="w-full max-w-md z-10 px-6 py-10 transition-transform duration-300"
        style={{ transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : 'none' }}
      >
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,249,236,0.92)_100%)] backdrop-blur-xl rounded-[2.75rem] shadow-[0_24px_60px_rgba(120,96,24,0.18)] p-8 md:p-10 border border-luxury-gold-200/60 ring-1 ring-luxury-gold-100/70 relative overflow-hidden font-heading">

          {/* Decorative Shine */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gold-shimmer opacity-80"></div>
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(600px_circle_at_30%_0%,rgba(255,255,255,0.8),transparent_55%)]"></div>

          {isRegistering && (
            <div className="w-full flex justify-end -mt-2 mb-2">
              <button
                type="button"
                onClick={toggleMode}
                className="px-3 py-1.5 text-xs font-bold tracking-[0.2em] uppercase text-luxury-gold-700 border border-luxury-gold-200/70 rounded-full bg-white/70 hover:bg-white transition-colors"
              >
                返回登录
              </button>
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gold-gradient rounded-2xl flex items-center justify-center shadow-gold-glow-sm mb-6 transform rotate-3 transition-transform hover:rotate-6 duration-300 group ring-1 ring-luxury-gold-200/70">
              <Dice5 className="w-10 h-10 text-[#2B2314] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h1 className="text-3xl font-display text-slate-900 tracking-[0.04em] mb-2">
              {isRegistering ? '创建账号' : '欢迎回来'}
            </h1>
            <p className="text-luxury-gold-700 text-sm font-medium tracking-wide">麻上记 - 记录每一份好运</p>
          </div>

          {/* Apple Login - Primary Option (Hidden on Android) */}
          {Capacitor.getPlatform() !== 'android' && (
            <>
              <button
                onClick={async () => {
                  try {
                    const user = await authService.loginWithApple();
                    if (user) {
                      onLoginSuccess(user);
                    }
                  } catch (err: any) {
                    // 如果是用户取消登录，不显示错误提示
                    if (err.message === '用户取消登录') return;
                    setError(err.message);
                  }
                }}
                disabled={loading}
                className="w-full mb-8 py-4 bg-white/90 text-slate-900 border border-luxury-gold-300/60 rounded-2xl font-bold text-lg shadow-[0_16px_36px_rgba(212,175,55,0.16)] flex items-center justify-center transition-all duration-300 hover:bg-[#FFF7E1] hover:shadow-[0_20px_44px_rgba(212,175,55,0.22)] active:scale-[0.98] active:shadow-[0_10px_24px_rgba(212,175,55,0.18)] group relative overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-luxury-gold-100/70 to-transparent -translate-x-full group-hover:animate-shimmer-sweep" />

                <svg className="w-6 h-6 mr-3" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
                </svg>
                通过 Apple 登录
              </button>

              {/* Divider */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-luxury-gold-200/60"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="px-4 bg-[#FFFBF2]/80 backdrop-blur-sm text-luxury-gold-700 font-medium">或者使用邮箱</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-luxury-gold-700">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-luxury-gold-400 group-focus-within:text-luxury-gold-600 transition-colors duration-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className={`w-full pl-12 pr-4 ${inputPadding} bg-[#FFFBF4] border border-luxury-gold-200/70 rounded-2xl text-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-luxury-gold-300/40 focus:border-luxury-gold-500 transition-all duration-300`}
                />
              </div>
            </div>

            {/* Username (Register Only) */}
            {isRegistering && (
              <div className="space-y-1.5 animate-fade-in-down group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-luxury-gold-700">昵称</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-luxury-gold-400 group-focus-within:text-luxury-gold-600 transition-colors duration-300" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="怎么称呼您"
                    className={`w-full pl-12 pr-4 ${inputPadding} bg-[#FFFBF4] border border-luxury-gold-200/70 rounded-2xl text-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-luxury-gold-300/40 focus:border-luxury-gold-500 transition-all duration-300`}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-luxury-gold-700">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-luxury-gold-400 group-focus-within:text-luxury-gold-600 transition-colors duration-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className={`w-full pl-12 pr-4 ${inputPadding} bg-[#FFFBF4] border border-luxury-gold-200/70 rounded-2xl text-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-luxury-gold-300/40 focus:border-luxury-gold-500 transition-all duration-300`}
                />
              </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {isRegistering && (
              <div className="space-y-1.5 animate-fade-in-down group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-luxury-gold-700">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-luxury-gold-400 group-focus-within:text-luxury-gold-600 transition-colors duration-300" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className={`w-full pl-12 pr-4 ${inputPadding} bg-[#FFFBF4] border border-luxury-gold-200/70 rounded-2xl text-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-luxury-gold-300/40 focus:border-luxury-gold-500 transition-all duration-300`}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-rose-600 text-sm text-center font-medium bg-rose-50/80 border border-rose-100 py-3 rounded-xl animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-4 rounded-2xl font-bold text-[#2B2314] shadow-[0_16px_36px_rgba(212,175,55,0.25)] flex items-center justify-center transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${loading
                ? 'bg-luxury-gold-200 cursor-not-allowed shadow-none'
                : 'bg-gold-gradient hover:bg-gold-gradient-hover hover:shadow-[0_20px_44px_rgba(212,175,55,0.3)]'
                }`}
            >
              {loading ? (isRegistering ? '注册中...' : '登录中...') : (
                <>
                  {isRegistering ? '立即注册' : '进入应用'} <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center bg-[#FFFBF2]/70 mx-[-2.5rem] mb-[-2.5rem] p-6 border-t border-luxury-gold-200/60">
            <button
              type="button"
              onClick={toggleMode}
              className="text-luxury-gold-700 font-bold text-sm hover:text-luxury-gold-800 transition-colors flex items-center justify-center w-full group"
            >
              {isRegistering ? (
                <>
                  已有账号？<span className="underline decoration-2 decoration-transparent group-hover:decoration-luxury-gold-700 transition-all ml-1">去登录</span>
                </>
              ) : (
                <>
                  没有账号？<span className="underline decoration-2 decoration-transparent group-hover:decoration-luxury-gold-700 transition-all ml-1">去注册</span>
                </>
              )}
            </button>
          </div>

        </div>

        <p className="text-center text-xs text-luxury-gold-700/70 mt-8 font-medium tracking-[0.25em] uppercase">
          数据安全存储于云端
        </p>
      </div>
    </div>
  );
};

export default Login;
