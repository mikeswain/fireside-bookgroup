import { NextRequest, NextResponse } from "next/server";
import { fetchBooks, commitBooks } from "@/lib/github";
import { findCover } from "@/lib/covers";
import type { Book } from "@/lib/types";

export const runtime = 'edge';
function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

const MEETING_HOUR = 19; // 7pm NZ time
const MEETING_MINUTE = 30;

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Calculate the third Tuesday of a given month/year, at MEETING_HOUR:MEETING_MINUTE Pacific/Auckland. */
function thirdTuesday(year: number, month: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const dayOfWeek = first.getUTCDay();
  const daysToTue = (2 - dayOfWeek + 7) % 7;
  const day = 1 + daysToTue + 14;

  // Use Intl to get the real UTC offset for this date in NZ (handles DST correctly)
  const ref = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const nzHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Auckland",
      hour: "2-digit",
      hour12: false,
    }).format(ref),
  );
  const offsetHours = nzHour - 12; // 12 (NZST) or 13 (NZDT)

  return new Date(Date.UTC(year, month - 1, day, MEETING_HOUR - offsetHours, MEETING_MINUTE, 0)).toISOString();
}

/** Convert a datetime-local value (NZ time) to an ISO string. */
function nzToIso(datetimeLocal: string): string {
  // datetimeLocal is "YYYY-MM-DDTHH:MM" in Pacific/Auckland
  const [datePart, timePart] = datetimeLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);

  // Get NZ offset for this date
  const ref = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const nzHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Auckland",
      hour: "2-digit",
      hour12: false,
    }).format(ref),
  );
  const offsetHours = nzHour - 12;

  return new Date(Date.UTC(y, m - 1, d, h - offsetHours, min, 0)).toISOString();
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

/** Shape of the form payload from the client (shared by POST and PUT). */
interface BookPayload {
  title: string;
  author: string;
  proposer: string;
  month: number;
  year: number;
  isbn: string;
  customDate?: string;
}

/** Build the core Book fields from a form payload, plus cover lookup. */
async function bookFromPayload(payload: BookPayload, id: string): Promise<Book> {
  const { title, author, proposer, isbn, month, year, customDate } = payload;
  const coverResult = await findCover(title, author, isbn);

  const book: Book = {
    id,
    title: title.trim(),
    author: author.trim() || undefined,
    proposer: proposer.trim(),
    isbn: isbn.trim() || coverResult.isbn || undefined,
    coverUrl: coverResult.coverUrl,
  };

  if (month && year) {
    book.meetingDate = customDate ? nzToIso(customDate) : thirdTuesday(year, month);
    book.month = month;
    book.year = year;
  }

  return book;
}

// --- POST: add a book ---
export async function POST(request: NextRequest) {
  try {
    const { sha, ...payload } = (await request.json()) as BookPayload & { sha: string };

    if (!payload.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const token = getToken();
    const { books, sha: currentSha } = await fetchBooks(token);

    if (sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const book = await bookFromPayload(payload, generateId());
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
    const { id, sha, ...payload } = (await request.json()) as BookPayload & { id: string; sha: string };

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const token = getToken();
    const { books, sha: currentSha } = await fetchBooks(token);

    if (sha !== currentSha) {
      return NextResponse.json(
        { error: "Data has changed. Please refresh and try again." },
        { status: 409 },
      );
    }

    const index = books.findIndex((b) => b.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const updated = await bookFromPayload(payload, id);

    // Preserve existing cover if the lookup didn't find one and content hasn't changed
    const existing = books[index];
    if (!updated.coverUrl && existing.coverUrl
      && updated.title === existing.title && updated.author === existing.author && updated.isbn === existing.isbn) {
      updated.coverUrl = existing.coverUrl;
    }

    books[index] = updated;
    sortBooks(books);

    await commitBooks(token, books, currentSha, `Update "${updated.title}"`);
    return NextResponse.json({ book: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- DELETE: remove a book ---
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string; sha: string; };

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
