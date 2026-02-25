import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { fetchJsonFile } from "@/lib/github";
import type { Book, Member } from "@/lib/types";

export const runtime = "edge";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

export async function GET(request: NextRequest) {
  try {
    const result = await requireMember(request);
    if (result instanceof NextResponse) return result;

    const token = getToken();
    const { data: members } = await fetchJsonFile<Member[]>(token, "data/members.json");
    const { data: books } = await fetchJsonFile<Book[]>(token, "data/books.json");

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
