import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Las peticiones a /api van al backend (FastAPI), así el navegador no ve dos orígenes distintos.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
