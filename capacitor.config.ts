import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alhafidz.trouvaille',
  appName: 'Trouvaille',
  webDir: 'dist',
  backgroundColor: '#0A0A0B',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  }
};

export default config;
