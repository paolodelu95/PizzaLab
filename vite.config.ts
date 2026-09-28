import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// L’APK usa la radice; la web app su GitHub Pages si pubblica con --base=/PizzaLab/app/.
export default defineConfig({ plugins: [react()], test: { include: ['src/**/*.test.ts'] } });
