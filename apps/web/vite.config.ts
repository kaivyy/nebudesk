import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: { port: 5050, host: '0.0.0.0' },
  preview: { port: 5050, host: '0.0.0.0' }
})
