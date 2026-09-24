import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Local development: forward /api to the Express API server (node server.js).
  server: {
    proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:3000' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor';
          }
        },
      },
    },
    minify: 'oxc',
    cssMinify: true,
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
})
