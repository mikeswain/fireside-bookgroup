import { NextRequest, NextResponse } from "next/server";
import { fetchJsonFile, commitJsonFile } from "@/lib/github";
import type { Member } from "@/lib/types";

export const runtime = "edge";

const MEMBERS_PATH = "data/members.json";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

function sortMembers(members: Member[]): void {
  members.sort((a, b) =>
    a.givenName.localeCompare(b.givenName) || a.familyName.localeCompare(b.familyName),
  );
}

// --- GET: list all members ---
export async function GET() {
  try {
    const { data: members, sha } = await fetchJsonFile<Member[]>(getToken(), MEMBERS_PATH);
    return NextResponse.json({ members, sha });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- POST: add a member ---
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      givenName: string;
      familyName?: string;
      email?: string;
      sha: string;
    };

    if (!body.givenName?.trim()) {
      return NextResponse.json({ error: "Given name is required" }, { status: 400 });
    }

    const token = getToken();
    const { data: members, sha: currentSha } = await fetchJsonFile<Member[]>(token, MEMBERS_PATH);

    if (body.sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const member: Member = {
      givenName: body.givenName.trim(),
      familyName: body.familyName?.trim() ?? "",
      email: body.email?.trim() ?? "",
    };

    members.push(member);
    sortMembers(members);

    await commitJsonFile(token, MEMBERS_PATH, members, currentSha, `Add member "${member.givenName}"`);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- PUT: update a member ---
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      originalGivenName: string;
      originalFamilyName: string;
      givenName?: string;
      familyName?: string;
      email?: string;
      sha: string;
    };

    const token = getToken();
    const { data: members, sha: currentSha } = await fetchJsonFile<Member[]>(token, MEMBERS_PATH);

    if (body.sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const index = members.findIndex(
      (m) => m.givenName === body.originalGivenName && m.familyName === body.originalFamilyName,
    );
    if (index === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (body.givenName !== undefined) members[index].givenName = body.givenName.trim();
    if (body.familyName !== undefined) members[index].familyName = body.familyName.trim();
    if (body.email !== undefined) members[index].email = body.email.trim();

    sortMembers(members);

    await commitJsonFile(token, MEMBERS_PATH, members, currentSha, `Update member "${members[index].givenName}"`);
    return NextResponse.json({ member: members[index] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- DELETE: remove a member ---
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      givenName: string;
      familyName: string;
      sha: string;
    };

    const token = getToken();
    const { data: members, sha: currentSha } = await fetchJsonFile<Member[]>(token, MEMBERS_PATH);

    if (body.sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const index = members.findIndex(
      (m) => m.givenName === body.givenName && m.familyName === body.familyName,
    );
    if (index === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const [removed] = members.splice(index, 1);
    await commitJsonFile(token, MEMBERS_PATH, members, currentSha, `Delete member "${removed.givenName}"`);
    return NextResponse.json({ deleted: `${removed.givenName} ${removed.familyName}`.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
