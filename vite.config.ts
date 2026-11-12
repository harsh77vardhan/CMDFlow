import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [cloudflare()],
  server: { port: 5197, strictPort: true },
  build: { target: 'es2022' },
})
