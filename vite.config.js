import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevServerPlugin() {
  let appPromise = null
  return {
    name: 'stem-quest-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api') && !process.env.VITE_API_PORT) {
          try {
            const env = loadEnv(server.config.mode || 'development', process.cwd(), '')
            Object.assign(process.env, env)

            if (!appPromise) {
              const hasSupabase = Boolean(
                (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
                (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)
              )
              if (hasSupabase) {
                console.log('[STEM QUEST] Connecting API directly to Supabase production database...')
                const { createProductionApi } = await import('./src/features/game-session/api/production-server.js')
                appPromise = createProductionApi().then((res) => res.app)
              } else {
                console.log('[STEM QUEST] No Supabase credentials found, running fallback dev server...')
                const { createDemoApi } = await import('./src/features/game-session/api/dev-server.js')
                appPromise = Promise.resolve(createDemoApi().app)
              }
            }
            const app = await appPromise
            const { handle } = await import('./src/features/game-session/api/dev-server.js')
            return handle(app, req, res)
          } catch (err) {
            console.error('API dev middleware error:', err)
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevServerPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || '4100'}`,
        changeOrigin: true,
      },
    },
  },
})
