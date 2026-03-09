import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// To analyze bundle: npm i -D rollup-plugin-visualizer && ANALYZE=true npm run build

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-jose': ['jose'],
        },
      },
    },
  },
}))
