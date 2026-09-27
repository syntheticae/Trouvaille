import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alhafidz.trouvaille',
  appName: 'Trouvaille',
  webDir: 'dist',
  backgroundColor: '#0A0A0B',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '#0A0A0B',
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
