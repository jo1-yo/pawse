import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The extension reuses the app's pure-TS planning engine from ../src.
// Expo-only modules it references are swapped for browser shims.
const appSrc = path.resolve(__dirname, '../src');
const shim = (name: string) => path.resolve(__dirname, `src/shims/${name}.ts`);

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${appSrc}/` },
      { find: 'expo-localization', replacement: shim('expo-localization') },
      { find: 'expo-file-system', replacement: shim('expo-file-system') },
      { find: 'expo-sharing', replacement: shim('expo-sharing') },
      { find: 'react-native', replacement: shim('react-native') },
    ],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { sidepanel: path.resolve(__dirname, 'sidepanel.html') },
    },
  },
  server: {
    open: '/sidepanel.html',
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
});
