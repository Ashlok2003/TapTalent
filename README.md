# USD to ARS Currency API (TypeScript + Prisma)

Professional backend for USD/ARS exchange rates with Prisma ORM.

## Setup
1. `git clone <repo> && cd currency-api`
2. `npm install`
3. `npx prisma init --datasource-provider sqlite` (if not done)
4. Copy `.env.example` to `.env`; set `DATABASE_URL="file:./dev.db"`
5. `npm run db:push` (creates DB)
6. Tweak selectors in `src/services/scraper.ts` (inspect sites for current prices ~1425/1445 as of 2025-11-01).
7. `npm run dev`

## Usage
- Docs: http://localhost:3000/api-docs (YAML Swagger UI)
- `/quotes`: Array of quotes
- `/average`: Avg prices
- `/slippage`: % differences
- Prisma Studio: `npm run db:studio` (view DB)

## Test
`npm test`

## Build/Deploy
1. `npm run build`
2. Git push.
3. Render.com: New Web Service > Docker > GitHub repo.
   - Env: Add `DATABASE_URL="file:./quotes.db"` (Render persists volumes).
   - Auto-builds Prisma client.
4. Public URL: e.g., https://your-app.onrender.com/quotes

## Notes
- Freshness: Cache 60s; Prisma cleans old quotes.
- Scraping: Puppeteer + fallbacks; monitor logs, update selectors.
- For BRL: Swap sources/selectors in scraper.ts.
- Prisma: Type-safe queries; easy to scale to Postgres.
