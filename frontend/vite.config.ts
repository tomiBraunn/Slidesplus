import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Windows junctions inside these dirs crash chokidar; none of them are app source
      ignored: ['**/.claude/**', '**/.agents/**', '**/.impeccable/**'],
    },
  }
})