
import React, { useState } from 'react';
import { Dice5, ArrowRight, Lock, User as UserIcon, Mail } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

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
        // Note: services/authService now accepts (email, password, username)
        user = await authService.register(email.trim(), password.trim(), username.trim());
      } else {
        // Note: services/authService now accepts (email, password)
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
    // Keep email if user wants to switch context
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-mahjong-200 rounded-full opacity-20 blur-3xl"></div>

      <div className="w-full max-w-sm z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-mahjong-600 rounded-2xl flex items-center justify-center shadow-xl mb-6 transform rotate-6">
            <Dice5 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-wider mb-2">
            {isRegistering ? '创建账号' : '欢迎回来'}
          </h1>
          <p className="text-gray-500 text-sm">麻上记 - 记录每一份好运</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Username (Register Only) */}
          {isRegistering && (
            <div className="space-y-1 animate-fade-in-down">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">昵称</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="怎么称呼您"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Confirm Password (Register Only) */}
          {isRegistering && (
            <div className="space-y-1 animate-fade-in-down">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">确认密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all shadow-sm"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-2 rounded-xl font-bold text-white shadow-lg flex items-center justify-center transition-all transform active:scale-[0.98] ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-mahjong-600 hover:bg-mahjong-700 hover:shadow-mahjong-500/30'
              }`}
          >
            {loading ? (isRegistering ? '注册中...' : '登录中...') : (
              <>
                {isRegistering ? '立即注册' : '进入应用'} <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-400">其他方式登录</span>
            </div>
          </div>

          <button
            onClick={async () => {
              // setLoading(true); // Disable global loading to avoid "Small Ma Delight" screen flash
              try {
                const user = await authService.loginWithApple();
                if (user) {
                  onLoginSuccess(user);
                }
                // If user is null, it means we are redirecting to Apple, so do nothing (don't set loading/success)
              } catch (err: any) {
                setError(err.message);
                // setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full mt-4 py-4 bg-white border border-gray-300 rounded-xl font-bold text-black shadow-sm flex items-center justify-center transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            {/* Apple Logo SVG */}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
            </svg>
            通过 Apple 登录
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-mahjong-600 font-bold text-sm hover:underline"
          >
            {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
          <p className="text-xs text-gray-400 mt-4">
            数据安全存储于云端
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
