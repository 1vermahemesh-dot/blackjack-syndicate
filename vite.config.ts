import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel deploys to the root domain, so we use '/' instead of the repo name
  base: '/',
})