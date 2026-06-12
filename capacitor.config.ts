import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.growmate',
  appName: 'GrowMate',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_growmate',
      iconColor: '#9BE15D',
    },
  },
};

export default config;
