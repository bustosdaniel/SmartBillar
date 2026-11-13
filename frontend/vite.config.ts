/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas (npm test): jsdom para que los módulos que usan localStorage y los componentes funcionen.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    // Las peticiones a /api van al backend (FastAPI), así el navegador no ve dos orígenes distintos.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
