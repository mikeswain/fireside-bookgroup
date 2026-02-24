import { NextRequest, NextResponse } from "next/server";
import { fetchJsonFile } from "./github";
import type { Member } from "./types";

const MEMBERS_PATH = "data/members.json";

/**
 * Extract the authenticated user's email.
 * Checks (in order):
 * 1. Cf-Access-Authenticated-User-Email header (set by CF Access on protected paths)
 * 2. CF_Authorization JWT cookie (set after CF Access login, present on ALL paths)
 * 3. dev_auth_email cookie (set by /api/auth/login in dev)
 */
export function getEmail(request: NextRequest): string | undefined {
  const header = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (header) return header;

  const cfCookie = request.cookies.get("CF_Authorization")?.value;
  if (cfCookie) {
    try {
      const payload = JSON.parse(atob(cfCookie.split(".")[1]));
      if (payload.email) return payload.email as string;
    } catch {
      // malformed JWT — fall through
    }
  }

  return request.cookies.get("dev_auth_email")?.value ?? undefined;
}

/** Read members — tries local file first, falls back to GitHub API. */
async function getMembers(): Promise<Member[]> {
  try {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const raw = readFileSync(join(process.cwd(), "data", "members.json"), "utf-8");
    return JSON.parse(raw) as Member[];
  } catch {
    // Edge runtime — fall back to GitHub API
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN not configured");
    const { data } = await fetchJsonFile<Member[]>(token, MEMBERS_PATH);
    return data;
  }
}

/** Require the caller to be a known member. Returns the Member or an error response. */
export async function requireMember(
  request: NextRequest,
): Promise<Member | NextResponse> {
  const email = getEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const members = await getMembers();
  const member = members.find(
    (m) => m.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  return member;
}

/** Require the caller to be an admin member. Returns the Member or an error response. */
export async function requireAdmin(
  request: NextRequest,
): Promise<Member | NextResponse> {
  const result = await requireMember(request);
  if (result instanceof NextResponse) return result;

  if (!result.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return result;
}
