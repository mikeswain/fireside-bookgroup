import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { fetchJsonFile } from "@/lib/github";
import { displayName } from "@/lib/types";
import type { Member } from "@/lib/types";

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

interface SendPayload {
  subject: string;
  body: string;
  recipientEmails: string[];
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

    const htmlBody = textBody.split("\n").map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`).join("\n");
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
