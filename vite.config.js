import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // 允许局域网访问，方便手机测试
    strictPort: true,
  },
  resolve: {
    alias: {
      '@frontend': resolve(__dirname, 'frontend/src'),
      '@admin': resolve(__dirname, 'admin/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
