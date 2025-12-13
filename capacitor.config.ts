import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.mashangji.app',
    appName: '麻上记',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
