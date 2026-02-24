import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Logout endpoint. Clears the dev auth cookie and redirects.
 * - Production: redirects to CF Access logout (which clears the CF session)
 * - Dev: clears dev_auth_email cookie and redirects to home
 */
export async function GET(request: NextRequest) {
  const hasCfSession = request.cookies.has("CF_Authorization");
  const redirectTo = hasCfSession ? "/cdn-cgi/access/logout" : "/";

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.delete("dev_auth_email");
  return response;
}
