import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// Plugin to copy page scripts to dist
function copyPageScripts() {
  return {
    name: 'copy-page-scripts',
    closeBundle() {
      const srcDir = resolve(__dirname, 'src/page-scripts')
      const destDir = resolve(__dirname, 'dist/src/page-scripts')

      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }

      if (existsSync(resolve(srcDir, 'game-data-reader.js'))) {
        copyFileSync(
          resolve(srcDir, 'game-data-reader.js'),
          resolve(destDir, 'game-data-reader.js')
        )
        console.log('Copied page-scripts to dist')
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      watchFilePaths: ['manifest.json'],
      browser: 'chrome',
    }),
    copyPageScripts(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
})
