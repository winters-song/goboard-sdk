import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      // 联调源码时改回：resolve(__dirname, '../src/index.ts')
      'goboard-sdk': resolve(__dirname, '../dist/goboard-sdk.js'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
