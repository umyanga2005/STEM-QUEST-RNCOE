# Start everything for Demo mode (in-memory backend):
npm run dev:demo       # Vite + demo API on port 4100

# Start everything for Production mode (Supabase backend):
npm run api:production &  # Hono API on port 4101
npm run dev              # Vite (proxies /api → 4101)

# Quick verify question bank health:
node scripts/content-bank/verify-bank.mjs

# Lint check:
npx oxlint src/
