import { defineConfig } from 'vite';
import path from 'node:path';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@common': path.resolve(__dirname, './common'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
      },
    ]),
    {
      name: 'copy-helios-runner',

      closeBundle() {
        copyFileSync(
          path.resolve(__dirname, 'electron/heliosRunner.js'),
          path.resolve(__dirname, 'dist-electron/heliosRunner.js')
        );
      },
    }
  ],
});
