import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

function serveDataPlugin() {
  return {
    name: 'serve-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const filePath = path.resolve(__dirname, '../data', req.url.slice(1))
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/json')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), serveDataPlugin()],
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
