import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.irenglish.app',
  appName: 'IRENGlish',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' }
};

export default config;
