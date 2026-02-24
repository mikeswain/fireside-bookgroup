import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import type { Book, Member } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const result = await requireMember(request);
    if (result instanceof NextResponse) return result;

    const members: Member[] = JSON.parse(
      readFileSync(join(process.cwd(), "data", "members.json"), "utf-8"),
    );
    const books: Book[] = JSON.parse(
      readFileSync(join(process.cwd(), "data", "books.json"), "utf-8"),
    );

    const recipients = members.filter((m) => m.notifiable && m.email);

    const now = new Date();
    const nextBook =
      books
        .filter((b) => b.meetingDate && new Date(b.meetingDate) >= now)
        .sort((a, b) => new Date(a.meetingDate!).getTime() - new Date(b.meetingDate!).getTime())[0] ?? null;

    return NextResponse.json({ sender: result, recipients, nextBook });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
