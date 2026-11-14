import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server forwards API calls to the two Spring Boot microservices.
// Order matters: the more specific alert-service paths are listed first.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/alerts':   { target: 'http://127.0.0.1:8082', changeOrigin: true },
      '/api/insights': { target: 'http://127.0.0.1:8082', changeOrigin: true },
      '/api':          { target: 'http://127.0.0.1:8081', changeOrigin: true },
    },
  },
})
