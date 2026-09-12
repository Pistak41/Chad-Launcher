import { defineConfig } from 'vite';
import path from 'node:path';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

const isExternal = (id: string) => {
  if (id.startsWith('helios-core') || id.startsWith('helios-distribution-types')) return true;
  if (id.startsWith('node:')) return true;
  return Object.keys(pkg.dependencies || {}).includes(id);
};

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
        vite: {
          build: {
            rollupOptions: {
              external: isExternal
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
      },
      {
        entry: 'electron/heliosRunner.ts',
        vite: {
          build: {
            rollupOptions: {
              external: isExternal
            }
          }
        }
      },
    ]),
  ],
});
