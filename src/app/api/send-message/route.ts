import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { fetchJsonFile } from "@/lib/github";
import { displayName } from "@/lib/types";
import type { Book, Member } from "@/lib/types";

export const runtime = "edge";

const MEMBERS_PATH = "data/members.json";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

function getResendKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  return key;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const BOOKS_PATH = "data/books.json";

interface SendPayload {
  subject: string;
  body: string;
  recipientEmails: string[];
}

function bookSearchUrl(book: Book): string {
  if (book.isbn) return `https://openlibrary.org/isbn/${book.isbn.replace(/[-\s]/g, "")}`;
  const q = book.author ? `${book.title} ${book.author}` : book.title;
  return `https://bookhub.co.nz/catalog/search?utf8=%E2%9C%93&keyword=${encodeURIComponent(q)}&search_type=core%5Ekeyword`;
}

function renderBookCardHtml(book: Book): string {
  const url = bookSearchUrl(book);
  const date = book.meetingDate ? new Date(book.meetingDate) : null;
  const dateStr = date
    ? date.toLocaleDateString("en-NZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";
  const timeStr = date
    ? date.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })
    : "";

  const cover = book.coverUrl
    ? `<img src="${escapeHtml(book.coverUrl)}" alt="Cover" style="width:80px;height:112px;object-fit:cover;border-radius:8px;margin-right:16px;float:left">`
    : "";

  return `<div style="margin:16px 0;padding:16px;border:2px solid #d97706;border-radius:12px;background:#fffbeb;font-family:system-ui,sans-serif;overflow:hidden">
<p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#d97706">This month&rsquo;s book</p>
${cover}<div>
<p style="margin:0;font-size:18px;font-weight:700"><a href="${escapeHtml(url)}" style="color:#78350f;text-decoration:underline">${escapeHtml(book.title)}</a></p>
${book.author ? `<p style="margin:4px 0 0;font-size:14px;font-style:italic;color:#b45309">${escapeHtml(book.author)}</p>` : ""}
${dateStr ? `<p style="margin:8px 0 0;font-size:13px;color:#92400e">${escapeHtml(dateStr)} at ${escapeHtml(timeStr)}</p>` : ""}
${book.proposer ? `<p style="margin:4px 0 0;font-size:13px;color:#92400e">Proposed by <strong style="color:#78350f">${escapeHtml(book.proposer)}</strong></p>` : ""}
${book.isbn ? `<p style="margin:4px 0 0;font-size:11px;color:#b45309">ISBN: ${escapeHtml(book.isbn)}</p>` : ""}
</div></div>`;
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireMember(request);
    if (result instanceof NextResponse) return result;
    const sender = result;

    const { subject, body, recipientEmails } = (await request.json()) as SendPayload;

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }
    if (!recipientEmails?.length) {
      return NextResponse.json({ error: "At least one recipient is required" }, { status: 400 });
    }

    // Validate all recipient emails are notifiable members
    const { data: members } = await fetchJsonFile<Member[]>(getToken(), MEMBERS_PATH);
    const notifiableEmails = new Set(
      members.filter((m) => m.notifiable && m.email).map((m) => m.email!.toLowerCase()),
    );
    const invalid = recipientEmails.filter((e) => !notifiableEmails.has(e.toLowerCase()));
    if (invalid.length) {
      return NextResponse.json({ error: `Invalid recipients: ${invalid.join(", ")}` }, { status: 400 });
    }

    const fromAddress = process.env.EMAIL_FROM;
    if (!fromAddress) throw new Error("EMAIL_FROM not configured");

    const senderName = displayName(sender);
    const textBody = body.trim();
    const textFooter = `\n\n— Sent by ${senderName} via Puhoi Fireside Bookgroup.\nWe are a small but vibrant group of readers in Puhoi, New Zealand, website https://bookgroup.hiko.co.nz.\nIf you don't want to be contacted, think this has been sent in error, or maliciously, please email the webmaster mike@hiko.co.nz`;

    const { data: books } = await fetchJsonFile<Book[]>(getToken(), BOOKS_PATH);
    const now = new Date();
    const nextBook = books
      .filter((b) => b.meetingDate && new Date(b.meetingDate) >= now)
      .sort((a, b) => new Date(a.meetingDate!).getTime() - new Date(b.meetingDate!).getTime())[0] ?? null;
    const bookCard = nextBook ? renderBookCardHtml(nextBook) : "";
    const htmlBody = textBody.split("\n").map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`).join("\n") + bookCard;
    const htmlFooter = `<hr style="margin:24px 0;border:none;border-top:1px solid #ddd">
<p style="font-size:13px;color:#666">— Sent by ${escapeHtml(senderName)} via <a href="https://bookgroup.hiko.co.nz">Puhoi Fireside Bookgroup</a>.<br>
We are a small but vibrant group of readers in Puhoi, New Zealand.<br>
If you don't want to be contacted, think this has been sent in error, or maliciously, please email the webmaster <a href="mailto:mike@hiko.co.nz">mike@hiko.co.nz</a></p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getResendKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmails,
        reply_to: sender.email,
        subject: subject.trim(),
        text: textBody + textFooter,
        html: htmlBody + htmlFooter,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: (err as { message?: string; }).message ?? "Resend API error" },
        { status: res.status },
      );
    }

    return NextResponse.json({ sent: recipientEmails.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
