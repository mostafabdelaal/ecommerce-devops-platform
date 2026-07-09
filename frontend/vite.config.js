import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/products': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/orders': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})
