import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "it.pizzalab.app",
  appName: "PizzaLab",
  webDir: "dist",
  android: { backgroundColor: "#faf7f2" },
  plugins: {
    LocalNotifications: { smallIcon: "ic_stat_pizza", iconColor: "#e0532b" },
  },
};
export default config;
