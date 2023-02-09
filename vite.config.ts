import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/20230205_MaskDetect/", // これで出力パスが　/assets から　./assetsに変わる
  assetsInclude: ['**/*.bin', '**/*.json'], // うまくモデルを読み込めない問題
  plugins: [vue()],
  build: {
    outDir: 'docs',
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
})
