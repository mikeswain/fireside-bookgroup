import { NextRequest, NextResponse } from "next/server";
import { fetchBooks, commitBooks } from "@/lib/github";
import { findCover } from "@/lib/covers";
import type { Book } from "@/lib/types";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Calculate the third Tuesday of a given month/year, at 19:00 NZST. */
function thirdTuesday(year: number, month: number): string {
  // Find the first day of the month
  const first = new Date(Date.UTC(year, month - 1, 1));
  // Day of week: 0=Sun, 1=Mon, 2=Tue
  const dayOfWeek = first.getUTCDay();
  // Days until first Tuesday
  const daysToTue = (2 - dayOfWeek + 7) % 7;
  // Third Tuesday = first Tuesday + 14 days
  const thirdTue = 1 + daysToTue + 14;

  // 7pm NZST = 7am UTC (NZST is UTC+12), NZDT = 6am UTC (UTC+13)
  // Use a rough heuristic: Oct-Mar is NZDT (UTC+13), Apr-Sep is NZST (UTC+12)
  const isDst = month >= 10 || month <= 3;
  const utcHour = isDst ? 6 : 7;

  const date = new Date(Date.UTC(year, month - 1, thirdTue, utcHour, 0, 0));
  return date.toISOString();
}

// --- GET: list all books ---
export async function GET() {
  try {
    const { books, sha } = await fetchBooks(getToken());
    return NextResponse.json({ books, sha });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- POST: add a book ---
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title: string;
      author?: string;
      proposer?: string;
      month?: number;
      year?: number;
      isbn?: string;
      sha: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const token = getToken();
    const { books, sha: currentSha } = await fetchBooks(token);

    if (body.sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    // Look up cover and ISBN
    const coverResult = await findCover(body.title, body.author, body.isbn);

    const book: Book = {
      id: generateId(),
      title: body.title.trim(),
      author: body.author?.trim() || undefined,
      proposer: body.proposer?.trim() ?? "",
      isbn: body.isbn?.trim() || coverResult.isbn || undefined,
      coverUrl: coverResult.coverUrl,
    };

    if (body.month && body.year) {
      book.meetingDate = thirdTuesday(body.year, body.month);
      book.month = body.month;
      book.year = body.year;
    }

    books.push(book);
    sortBooks(books);

    await commitBooks(token, books, currentSha, `Add "${book.title}"`);
    return NextResponse.json({ book }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- PUT: update a book ---
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id: string;
      title?: string;
      author?: string;
      proposer?: string;
      month?: number;
      year?: number;
      isbn?: string;
      sha: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const token = getToken();
    const { books, sha: currentSha } = await fetchBooks(token);

    if (body.sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const index = books.findIndex((b) => b.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const existing = books[index];
    const titleChanged = body.title !== undefined && body.title !== existing.title;
    const authorChanged = body.author !== undefined && body.author !== existing.author;
    const isbnChanged = body.isbn !== undefined && body.isbn !== existing.isbn;

    if (body.title !== undefined) existing.title = body.title.trim();
    if (body.author !== undefined) existing.author = body.author.trim() || undefined;
    if (body.proposer !== undefined) existing.proposer = body.proposer.trim();
    if (body.isbn !== undefined) existing.isbn = body.isbn.trim() || undefined;

    if (body.month !== undefined && body.year !== undefined) {
      if (body.month && body.year) {
        existing.meetingDate = thirdTuesday(body.year, body.month);
        existing.month = body.month;
        existing.year = body.year;
      } else {
        existing.meetingDate = undefined;
        existing.month = undefined;
        existing.year = undefined;
      }
    }

    // Re-lookup cover if title, author, or ISBN changed
    if (titleChanged || authorChanged || isbnChanged) {
      const coverResult = await findCover(
        existing.title,
        existing.author,
        existing.isbn,
      );
      if (coverResult.coverUrl) existing.coverUrl = coverResult.coverUrl;
      if (coverResult.isbn && !existing.isbn) existing.isbn = coverResult.isbn;
    }

    sortBooks(books);

    await commitBooks(token, books, currentSha, `Update "${existing.title}"`);
    return NextResponse.json({ book: existing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- DELETE: remove a book ---
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string; sha: string };

    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const token = getToken();
    const { books, sha: currentSha } = await fetchBooks(token);

    if (body.sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const index = books.findIndex((b) => b.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const [removed] = books.splice(index, 1);
    await commitBooks(token, books, currentSha, `Delete "${removed.title}"`);
    return NextResponse.json({ deleted: removed.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Sort books: dated first (by date ascending), then undated at the end. */
function sortBooks(books: Book[]): void {
  books.sort((a, b) => {
    if (!a.meetingDate && !b.meetingDate) return 0;
    if (!a.meetingDate) return 1;
    if (!b.meetingDate) return -1;
    return new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
  });
}
