import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This is the proxy configuration for development.
    // It redirects requests from the frontend dev server (5173) to the backend (4000).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // You also need to proxy the websocket connections.
      '/socket.io': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  // Ensure the build output is in the 'dist' folder for the backend to find it.
  build: {
    outDir: 'dist',
  }
});