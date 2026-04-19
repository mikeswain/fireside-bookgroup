# Plan: Per-member login on the public page (Google + GitHub via Auth.js)

## Goal
Let logged-in members use the message-send flow from the public page (not just
`/admin`), while keeping `members.json` as the single source of truth for who
counts as a member.

## Context
- `/admin` is currently gated by Cloudflare Access (email OTP + GitHub IdP).
- `src/lib/auth.ts` already abstracts identity via `getEmail(request)` and
  `requireMember(request)`. `getEmail` reads, in order: the
  `Cf-Access-Authenticated-User-Email` header, the `CF_Authorization` JWT
  cookie, and a `dev_auth_email` cookie for local dev.
- `/api/send-message` already calls `requireMember` and validates recipients
  against `members.json` — so anything that makes `getEmail` return a verified
  member email "just works" downstream.
- `GITHUB_TOKEN` (server-side PAT) is unrelated to user auth and stays as-is —
  it's what the API routes use to read/write `books.json` and `members.json`
  via the GitHub Contents API.

## Shape: Auth.js v5 with Google + GitHub providers, JWT sessions

### 1. Install
```
npm i next-auth@beta
```

### 2. `src/auth.ts` — central config
```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { fetchJsonFile } from "@/lib/github";
import type { Member } from "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, GitHub],
  session: { strategy: "jwt" }, // no DB needed
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const token = process.env.GITHUB_TOKEN!;
      const { data: members } = await fetchJsonFile<Member[]>(token, "data/members.json");
      return members.some((m) => m.email?.toLowerCase() === email);
    },
  },
});
```

### 3. `src/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
export const runtime = "edge";
```

### 4. Extend `getEmail()` in `src/lib/auth.ts`
Add an `await auth()` branch at the top — if an Auth.js session exists, use
that. Fall back to the existing CF header / CF JWT cookie / dev cookie logic.
Everything downstream (`requireMember`, `/api/send-message`, admin routes)
keeps working unchanged.

### 5. Public UI
- `SignInButton` component calling `signIn()` (lets user pick Google or GitHub).
- On the public page, conditionally render `MessageForm` when a session exists;
  otherwise show the sign-in button.
- `SignOutButton` in the member area.

### 6. Env vars
Add to Cloudflare Pages **and** `.env.local`:
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`

OAuth client setup:
- **Google Cloud Console**: OAuth 2.0 client; authorized redirect URIs
  `https://bookgroup.hiko.co.nz/api/auth/callback/google` and
  `http://localhost:3000/api/auth/callback/google`.
- **GitHub**: register an OAuth app; callback
  `/api/auth/callback/github` (both prod and localhost). Request the
  `user:email` scope so members with private GitHub emails still pass the
  allowlist check.

## Things to flag
- **Edge compatibility**: Auth.js v5 supports edge, but the `signIn` callback
  fetches `members.json` from GitHub on every login — adds ~200ms per sign-in.
  Acceptable for this use case.
- **Cloudflare Access coexistence**: if `/admin` stays behind CF Access,
  members see two different login UXs (CF screen for admin, Auth.js for
  message-send). Cleaner alternative: drop CF Access entirely and gate
  `/admin` via `isAdmin` flag + Auth.js — one login, one flow.
- **GitHub private emails**: default GitHub OAuth only returns public email.
  Requesting `user:email` scope fixes this; document for members whose GitHub
  email differs from their `members.json` email.

## Open questions
- Keep CF Access on `/admin` or migrate fully to Auth.js?
- Do we want a `/members` route for the message-send feature, or inline on the
  public page with a sign-in prompt?
