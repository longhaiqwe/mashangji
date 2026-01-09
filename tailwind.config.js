/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./index.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{ts,tsx}",
        "./hooks/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                // ============ Original Colors (Keep for compatibility) ============
                primary: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                rose: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    500: '#f43f5e',
                    600: '#e11d48',
                },
                mahjong: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                expense: '#10b981',
                income: '#f43f5e',
                win: '#f43f5e',
                loss: '#10b981',

                // ============ NEW Design System: 金融终端 × 东方奢华 ============

                // 猩红 - 盈利（中国股市风格）
                'win-crimson': {
                    DEFAULT: '#DC143C',
                    light: '#FF6B8A',
                    dark: '#B01030',
                },

                // 翠绿 - 亏损
                'loss-emerald': {
                    DEFAULT: '#00C853',
                    light: '#69F0AE',
                    dark: '#009624',
                },

                // 奢华金 - 财富象征
                'luxury-gold': {
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    200: '#FDE68A',
                    300: '#FCD34D',
                    400: '#FBBF24',
                    500: '#D4AF37', // Classic Gold
                    600: '#B59328',
                    700: '#927520',
                    800: '#786018',
                    900: '#624D12',
                },

                // 深色主题背景 - 深蓝黑系
                'dark-bg': {
                    primary: '#0A0E27',
                    secondary: '#151B3D',
                    tertiary: '#1F274D',
                },

                // 浅色主题背景
                'light-bg': {
                    primary: '#F8F9FA',
                    secondary: '#FFFFFF',
                    tertiary: '#F1F3F5',
                },
            },

            // ============ Custom Fonts ============
            fontFamily: {
                display: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"', 'serif'],
                heading: ['"Noto Sans SC"', '"PingFang SC"', 'sans-serif'],
                mono: ['"JetBrains Mono"', '"SF Mono"', '"Menlo"', 'monospace'],
                body: ['"Inter"', '"SF Pro Display"', '-apple-system', 'sans-serif'],
            },

            // ============ Custom Animations ============
            keyframes: {
                // 页面加载 - 从下往上浮现
                'reveal-up': {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },

                // 页面加载 - 从上往下浮现
                'reveal-down': {
                    '0%': { opacity: '0', transform: 'translateY(-30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },

                // 金色闪光
                'gold-shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },

                // 盈利粒子 - 向上飞舞
                'win-particles': {
                    '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
                    '100%': { transform: 'translateY(-100px) scale(0)', opacity: '0' },
                },

                // 亏损雨滴 - 向下落
                'loss-rain': {
                    '0%': { transform: 'translateY(-100px) scale(0)', opacity: '0' },
                    '50%': { opacity: '1' },
                    '100%': { transform: 'translateY(100px) scale(1)', opacity: '0' },
                },

                // 脉搏 - 用于重要图标
                'pulse-slow': {
                    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                    '50%': { transform: 'scale(1.05)', opacity: '0.9' },
                },

                // 数字滚动
                'count-up': {
                    '0%': { opacity: '0', transform: 'scale(0.5)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },

                // 微光扫过
                'shimmer-sweep': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },

                // 卡片悬浮
                'card-hover': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
            },

            animation: {
                'reveal-up': 'reveal-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
                'reveal-down': 'reveal-down 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
                'gold-shimmer': 'gold-shimmer 3s linear infinite',
                'win-particles': 'win-particles 1s ease-out forwards',
                'loss-rain': 'loss-rain 1s ease-in forwards',
                'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
                'count-up': 'count-up 0.5s ease-out backwards',
                'shimmer-sweep': 'shimmer-sweep 2s ease-in-out infinite',
                'card-hover': 'card-hover 0.3s ease-in-out',
            },

            // ============ Custom Box Shadows ============
            boxShadow: {
                // 金色发光
                'gold-glow': '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)',
                'gold-glow-sm': '0 0 10px rgba(212, 175, 55, 0.4)',

                // 盈利红色发光
                'win-glow': '0 0 20px rgba(220, 20, 60, 0.5), 0 0 40px rgba(220, 20, 60, 0.3)',

                // 3D 卡片阴影
                'card-3d': '0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
                'card-3d-hover': '0 12px 48px rgba(212, 175, 55, 0.15), 0 4px 16px rgba(0, 0, 0, 0.2)',

                // 内发光
                'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(212, 175, 55, 0.05)',
            },

            // ============ Custom Background Images ============
            backgroundImage: {
                'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%)',
                'gold-gradient-hover': 'linear-gradient(135deg, #F4E4BC 0%, #FFD700 50%, #F4E4BC 100%)',

                // 盈利背景渐变
                'win-gradient': 'linear-gradient(135deg, rgba(220, 20, 60, 0.1) 0%, rgba(220, 20, 60, 0.05) 100%)',

                // 亏损背景渐变
                'loss-gradient': 'linear-gradient(135deg, rgba(0, 200, 83, 0.1) 0%, rgba(0, 200, 83, 0.05) 100%)',

                // 卡片玻璃效果
                'card-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',

                // 金色边框渐变
                'gold-border': 'linear-gradient(135deg, #D4AF37, #F4E4BC, #D4AF37)',
            },

            // ============ Spacing Extensions ============
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem',
            },

            // ============ Border Radius Extensions ============
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
        }
    },
    plugins: [],
}
