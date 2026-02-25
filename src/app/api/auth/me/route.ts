import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const result = await requireMember(request);
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ member: result });
}
