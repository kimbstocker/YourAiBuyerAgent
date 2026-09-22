import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative so the built site works on GitHub Pages
// (https://<user>.github.io/YourAiBuyerAgent/) as well as any other static host.
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
