import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative, so the built site works on any static host
// (GitHub Pages, S3) without extra configuration.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5180, strictPort: true },
})
