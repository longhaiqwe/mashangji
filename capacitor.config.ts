import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.longhai.mashangji',
    appName: '麻上记',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        Keyboard: {
            resize: 'none' as any,  // 禁止自动调整 WebView 大小，我们手动处理
            resizeOnFullScreen: true
        },
        SplashScreen: {
            launchAutoHide: false,  // 禁用自动隐藏，由 React 代码手动控制
            backgroundColor: '#FFFFFF',
            showSpinner: false
        }
    }
};

export default config;
