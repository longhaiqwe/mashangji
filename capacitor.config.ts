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
        }
    }
};

export default config;
