import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: [/prop-types/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  optimizeDeps: {
    exclude: ['@react-three/fiber', '@react-three/drei', 'three', 'stats.js'],
    include: ['react-reconciler', 'scheduler', 'prop-types'],
    force: true,
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-reconciler', 'scheduler', 'prop-types'],
    alias: {
      'react-reconciler': path.resolve(__dirname, 'node_modules/react-reconciler'),
      'scheduler': path.resolve(__dirname, 'node_modules/scheduler'),
    },
  },
  define: {
    'global': 'globalThis',
  },
})
