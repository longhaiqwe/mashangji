
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F2F4F7] relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-mahjong-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

      {/* Card Container */}
      <div className="w-full max-w-md z-10 px-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 md:p-10 border border-white/50 relative overflow-hidden">

          {/* Decorative Shine */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-mahjong-500 to-mahjong-600 rounded-2xl flex items-center justify-center shadow-lg shadow-mahjong-500/30 mb-6 transform rotate-3 transition-transform hover:rotate-6 duration-300 group">
              <Dice5 className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-2">
              {isRegistering ? '创建账号' : '欢迎回来'}
            </h1>
            <p className="text-gray-500 text-sm font-medium">麻上记 - 记录每一份好运</p>
          </div>

          {/* Apple Login - Primary Option */}
          <button
            onClick={async () => {
              try {
                const user = await authService.loginWithApple();
                if (user) {
                  onLoginSuccess(user);
                }
              } catch (err: any) {
                setError(err.message);
              }
            }}
            disabled={loading}
            className="w-full mb-8 py-4 bg-gray-900 text-white border border-transparent rounded-2xl font-bold text-lg shadow-lg shadow-gray-200 flex items-center justify-center transition-all duration-300 hover:bg-black hover:shadow-xl active:scale-[0.98] active:shadow-md group relative overflow-hidden"
          >
            {/* Shine effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine" />

            <svg className="w-6 h-6 mr-3" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
            </svg>
            通过 Apple 登录
          </button>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-4 bg-white/50 backdrop-blur-sm text-gray-400 font-medium">或者使用邮箱</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 transition-colors group-focus-within:text-mahjong-600">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-mahjong-500 transition-colors duration-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-lg outline-none focus:bg-white focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Username (Register Only) */}
            {isRegistering && (
              <div className="space-y-1.5 animate-fade-in-down group">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 transition-colors group-focus-within:text-mahjong-600">昵称</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-mahjong-500 transition-colors duration-300" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="怎么称呼您"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-lg outline-none focus:bg-white focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 transition-colors group-focus-within:text-mahjong-600">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-mahjong-500 transition-colors duration-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-lg outline-none focus:bg-white focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {isRegistering && (
              <div className="space-y-1.5 animate-fade-in-down group">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 transition-colors group-focus-within:text-mahjong-600">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-mahjong-500 transition-colors duration-300" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-lg outline-none focus:bg-white focus:ring-2 focus:ring-mahjong-500/20 focus:border-mahjong-500 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-50/80 py-3 rounded-xl animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${loading
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-mahjong-600 to-mahjong-500 hover:shadow-mahjong-500/40 shadow-mahjong-500/20'
                }`}
            >
              {loading ? (isRegistering ? '注册中...' : '登录中...') : (
                <>
                  {isRegistering ? '立即注册' : '进入应用'} <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center bg-gray-50/50 mx-[-2.5rem] mb-[-2.5rem] p-6 border-t border-gray-100">
            <button
              type="button"
              onClick={toggleMode}
              className="text-mahjong-600 font-bold text-sm hover:text-mahjong-700 transition-colors flex items-center justify-center w-full group"
            >
              {isRegistering ? (
                <>
                  已有账号？<span className="underline decoration-2 decoration-transparent group-hover:decoration-mahjong-600 transition-all ml-1">去登录</span>
                </>
              ) : (
                <>
                  没有账号？<span className="underline decoration-2 decoration-transparent group-hover:decoration-mahjong-600 transition-all ml-1">去注册</span>
                </>
              )}
            </button>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-8 font-medium tracking-wide opacity-60">
          数据安全存储于云端
        </p>
      </div>
    </div>
  );
};

export default Login;
