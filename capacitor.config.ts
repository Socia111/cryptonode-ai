import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.59e92957e12b427fb4a669cc13955562',
  appName: 'cryptonode-ai',
  webDir: 'dist',
  server: {
    url: 'https://59e92957-e12b-427f-b4a6-69cc13955562.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      showSpinner: true,
      spinnerColor: '#6366f1'
    }
  }
};

export default config;