/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import dts from 'vite-plugin-dts'
import { emitLibAssets } from './scripts/emitLibAssets'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node',
  },
  plugins: [
    emitLibAssets(),
    dts({
      include: ['src'],
      outDir: 'dist',
      rollupTypes: true,
      tsconfigPath: './tsconfig.build.json',
      // Legacy sources are not fully strict-typed yet
      compilerOptions: {
        strict: false,
        skipLibCheck: true,
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GoboardSdk',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'goboard-sdk.js' : 'goboard-sdk.cjs'),
    },
    rollupOptions: {
      external: ['raphael', 'events'],
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
})
