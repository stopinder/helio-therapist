import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Explicit ESM export
export default defineConfig({
  plugins: [vue()],
  // Add explicit resolve configuration
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  }
})