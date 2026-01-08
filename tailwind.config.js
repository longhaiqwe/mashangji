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
                primary: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981', // Brand Emerald
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                slate: {
                    50: '#f8fafc', // Surface Light
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b', // Accent Blue
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a', // Surface Dark
                },
                rose: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    500: '#f43f5e', // Expense Red
                    600: '#e11d48',
                },
                // Semantic Aliases
                mahjong: { // Keep for backward compat ensuring code doesn't break immediately
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                expense: '#10b981', // New emerald-500 (Loss/Expense)
                income: '#f43f5e',  // New rose-500 (Win/Income)
                win: '#f43f5e',     // Re-mapped to red (Win)
                loss: '#10b981',    // Re-mapped to green (Loss)
            }
        }
    },
    plugins: [],
}
