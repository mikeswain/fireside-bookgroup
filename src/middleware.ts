import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight auth middleware.
 * - API routes: returns 401 JSON if no authenticated user
 * - Page routes: passes through (Cloudflare Access handles page auth in production;
 *   in dev, client components show auth errors if DEV_USER_EMAIL isn't set)
 * - /api/auth/me is NOT protected here — it handles its own auth so it can be
 *   called from public pages to check login status
 * - GET /api/books is public (static build reads it)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow GET /api/books (public page reads at build time)
  if (pathname.startsWith("/api/books") && request.method === "GET") {
    return NextResponse.next();
  }

  // Only gate API routes (not /api/auth/me which handles its own auth)
  if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check for authenticated user: CF Access header, CF JWT cookie, or dev env var
  let email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    const cfCookie = request.cookies.get("CF_Authorization")?.value;
    if (cfCookie) {
      try {
        const payload = JSON.parse(atob(cfCookie.split(".")[1]));
        email = payload.email ?? null;
      } catch {
        // malformed JWT
      }
    }
  }
  if (!email) {
    email = process.env.DEV_USER_EMAIL ?? null;
  }

  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/books",
    "/api/books/:path*",
    "/api/members",
    "/api/members/:path*",
    "/api/send-message",
    "/api/send-message/:path*",
    "/api/message-data",
    "/api/message-data/:path*",
    "/api/auth/me",
  ],
};
