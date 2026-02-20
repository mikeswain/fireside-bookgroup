# Puhoi Fireside Bookgroup

Single-page Next.js app displaying a calendar of book group meetings. Data is sourced from a public Google Sheet and stored in `data/books.json`.

## Tech Stack
- **Next.js 15** (App Router) with TypeScript
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **Cloudflare Workers** deployment via `@cloudflare/next-on-pages`

## Key Files
- `data/books.json` — all book/meeting data (generated, committed to git)
- `src/lib/types.ts` — `Book` interface
- `src/lib/books.ts` — reads `books.json` at build time
- `src/components/BookList.tsx` — renders featured, upcoming, and past books
- `src/app/page.tsx` — single page, server component
- `scripts/sync-sheet.ts` — fetches Google Sheet CSV, looks up covers/ISBNs from Open Library (with Google Books fallback), writes `books.json`
- `scripts/update.sh` — pull, sync, commit, push if changed

## Commands
- `npm run dev` — local dev server
- `npm run sync` — fetch sheet and update `data/books.json`
- `./scripts/update.sh` — full pull/sync/commit/push cycle
- `npm run build` — production build

## Data Flow
1. Book data lives in a public Google Sheet (CSV export)
2. `npm run sync` fetches the sheet, looks up covers and ISBNs from Open Library/Google Books, writes `data/books.json`
3. The page reads `books.json` at build time (server component, statically rendered)
4. To update: edit the Google Sheet, then run `./scripts/update.sh`

## Notes
- Cover images are validated for size (>1KB) to reject Open Library placeholders
- ISBNs from the spreadsheet take priority over Open Library lookups
- The page is fully static — no client-side JS needed
- Hero image: Unsplash (free licence), Library photo: Wikimedia Commons (CC-BY-SA-2.0)
