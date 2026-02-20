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
- `src/lib/covers.ts` — cover image lookup (Open Library, Google Books, BookHub NZ)
- `src/lib/github.ts` — read/write `books.json` via GitHub Contents API
- `src/components/BookList.tsx` — renders featured, upcoming, and past books
- `src/components/AdminBookList.tsx` — admin book table with edit/delete (client component)
- `src/components/BookForm.tsx` — add/edit book form (client component)
- `src/app/page.tsx` — public page, server component
- `src/app/admin/page.tsx` — admin page (protected by Cloudflare Access)
- `src/app/api/books/route.ts` — CRUD API: GET, POST, PUT, DELETE
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
5. **Admin UI alternative**: members can add/edit/delete books at `/admin`, which commits via GitHub API and triggers a Cloudflare Pages rebuild

## Admin UI
- **URL**: `/admin` (protected by Cloudflare Access)
- **API**: `/api/books` — GET, POST, PUT, DELETE (also protected by Cloudflare Access)
- **Flow**: Admin form → API route → reads `books.json` from GitHub → modifies → commits back → Cloudflare rebuilds (~30s)
- **Auth**: Cloudflare Access with email one-time passcode (configured in Zero Trust dashboard, not in code)
- **Cover lookup**: automatic on add/edit — tries Open Library, Google Books, BookHub NZ

### Cloudflare Setup
1. Add `GITHUB_TOKEN` as a secret in Cloudflare Pages dashboard (fine-grained PAT, repo-scoped, Contents: read+write)
2. Add `GITHUB_REPO` environment variable (e.g. `owner/repo`)
3. Optionally set `GITHUB_BRANCH` (defaults to `main`)
4. In Cloudflare Zero Trust dashboard, create a self-hosted application protecting `/admin` and `/api/books` paths
5. Add an Allow policy for member email addresses

## Notes
- Cover images are validated for size (>1KB) to reject Open Library placeholders
- ISBNs from the spreadsheet take priority over Open Library lookups
- The public page is fully static — no client-side JS needed
- The admin page is a client component that calls the API route (edge function)
- Hero image: Unsplash (free licence), Library photo: Wikimedia Commons (CC-BY-SA-2.0)
