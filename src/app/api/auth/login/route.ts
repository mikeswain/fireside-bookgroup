import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Login endpoint.
 * - Production: CF Access protects this path and handles the login flow.
 *   After auth, CF Access forwards here and we redirect back.
 * - Dev: reads DEV_USER_EMAIL, sets a dev_auth_email cookie, redirects back.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") || "/";
  const target = redirect.startsWith("/") ? redirect : "/";
  const response = NextResponse.redirect(new URL(target, request.url));

  // In dev, simulate login by setting a cookie from DEV_USER_EMAIL
  const devEmail = process.env.DEV_USER_EMAIL;
  if (devEmail) {
    response.cookies.set("dev_auth_email", devEmail, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}
