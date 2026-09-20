import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rrcafe.customer',
  appName: 'RRCafeCustomer',
  webDir: 'dist',
  server: {
    url: 'https://rrcafe.vercel.app',
    cleartext: true
  }
};

export default config;
