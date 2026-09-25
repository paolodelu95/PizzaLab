import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'it.pizzamico.app', appName: 'PizzAmico', webDir: 'dist',
  android: { backgroundColor: '#f6f7f4' },
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_pizza', iconColor: '#386149' } },
};
export default config;
