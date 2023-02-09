import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: "./", // これで出力パスが　/assets から　./assetsに変わる
  assetsInclude: ['**/*.bin', '**/*.json'], // うまくモデルを読み込めない問題
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
})
