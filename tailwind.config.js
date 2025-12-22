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
                mahjong: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    500: '#22c55e',
                    600: '#16a34a', // Primary Green
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },
                win: '#ef4444', // Red for Win
                loss: '#16a34a', // Green for Loss
            }
        }
    },
    plugins: [],
}
