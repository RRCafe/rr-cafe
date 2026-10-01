import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rrcafe.admin',
  appName: 'RR Cafe Admin',
  webDir: 'dist',
  server: {
    url: 'https://rr-cafe.vercel.app/admin',
    cleartext: true
  }
};

export default config;
