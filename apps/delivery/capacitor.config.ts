import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rrcafe.delivery',
  appName: 'RRCafeDelivery',
  webDir: 'dist',
  server: {
    url: 'https://rrcafe.vercel.app/delivery',
    cleartext: true
  }
};

export default config;
