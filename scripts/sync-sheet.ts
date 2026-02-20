/**
 * Fetches the published Google Sheet CSV and writes data/books.json.
 * Run with: npx tsx scripts/sync-sheet.ts
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
import type { Book } from "../src/lib/types";

const SHEET_ID =
  "2PACX-1vRzRmosulYnO-_E9gxHE8uRFcjPeCDYxFhxdytxuJ3s_vNaMWZuqY5x2ozpv-ZRDOE36i4kXeD5O2do";
const BOOKS_GID = "326204710";
const CSV_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${BOOKS_GID}&single=true&output=csv`;

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(current.trim());
      current = "";
    } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
      if (ch === "\r") i++;
    } else {
      current += ch;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

function parseMeetingDate(dateStr: string): Date | null {
  // Format: "Tuesday, 21 January 2020"
  const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = MONTH_NAMES[match[2].toLowerCase()];
  const year = parseInt(match[3]);
  if (!month) return null;
  return new Date(year, month - 1, day, 19, 0, 0);
}

function stableId(year: number, month: number, title: string): string {
  const key = `${year}-${month}-${title.toLowerCase().trim()}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

const MIN_COVER_BYTES = 1000;

/** Check a cover URL is a real image (not a tiny placeholder). */
async function isValidCover(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return false;
    // Check content-length header first
    const cl = Number(res.headers.get("content-length") || "0");
    if (cl > MIN_COVER_BYTES) return true;
    // No content-length — read the body and check size
    const buf = await res.arrayBuffer();
    return buf.byteLength > MIN_COVER_BYTES;
  } catch {
    return false;
  }
}

interface OpenLibraryResult {
  coverUrl?: string;
  isbn?: string;
}

/** Look up a book on Open Library. Returns cover URL and ISBN when available. */
async function lookupBook(
  title: string,
  author?: string,
  knownIsbn?: string,
): Promise<OpenLibraryResult> {
  // If we already have an ISBN, try direct cover lookup (validate size)
  if (knownIsbn) {
    const cleaned = knownIsbn.replace(/[-\s]/g, "");
    const url = `https://covers.openlibrary.org/b/isbn/${cleaned}-M.jpg`;
    if (await isValidCover(url)) {
      return { coverUrl: url, isbn: knownIsbn };
    }
  }

  // Search by title+author to find cover and/or ISBN
  const params = new URLSearchParams({
    title,
    limit: "1",
    fields: "cover_i,isbn",
  });
  if (author) params.set("author", author);
  const url = `https://openlibrary.org/search.json?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = (await res.json()) as {
      docs: Array<{ cover_i?: number; isbn?: string[] }>;
    };
    const doc = data.docs[0];
    if (!doc) return {};

    const result: OpenLibraryResult = {};

    // Grab ISBN (prefer ISBN-13 which starts with 978/979)
    const isbn13 = doc.isbn?.find((i) => i.length === 13);
    result.isbn = knownIsbn || isbn13 || doc.isbn?.[0];

    // Grab cover — cover_i is reliable; ISBN covers need size validation
    if (doc.cover_i) {
      result.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (doc.isbn?.[0]) {
      const url = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
      if (await isValidCover(url)) result.coverUrl = url;
    }

    return result;
  } catch {
    // Non-fatal
  }
  return {};
}

/** Fallback: try Google Books API for a cover image. */
async function googleBooksCover(
  title: string,
  author?: string,
): Promise<string | undefined> {
  const q = author ? `intitle:${title}+inauthor:${author}` : title;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      items?: Array<{
        volumeInfo?: { imageLinks?: { thumbnail?: string } };
      }>;
    };
    const thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    // Google returns http URLs and small images; upgrade to https and larger size
    const coverUrl = thumbnail
      ?.replace("http://", "https://")
      .replace("zoom=1", "zoom=2");
    if (coverUrl && (await isValidCover(coverUrl))) return coverUrl;
    return undefined;
  } catch {
    // Non-fatal
  }
  return undefined;
}

const DELAY_MS = 100; // be polite to APIs
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("Fetching sheet...");
  const response = await fetch(CSV_URL, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();

  const rows = parseCSV(text);
  const header = rows[0];
  console.log(`Columns: ${header.join(", ")}`);

  const books: Book[] = [];

  for (const row of rows.slice(1)) {
    const [yearStr, monthStr, dateStr, proposer, title, author, isbn] = row;

    // Skip rows without a title
    if (!title) continue;

    const year = parseInt(yearStr);
    const monthNum = MONTH_NAMES[monthStr?.toLowerCase()] ?? 0;
    const meetingDate = parseMeetingDate(dateStr ?? "");

    // Skip rows we can't parse a date for (the "Unknown" entries at the bottom)
    if (!meetingDate) continue;

    books.push({
      id: stableId(year, monthNum, title),
      proposer: proposer ?? "",
      meetingDate: meetingDate.toISOString(),
      month: monthNum,
      year,
      title,
      author: author || undefined,
      isbn: isbn || undefined,
    });
  }

  books.sort(
    (a, b) =>
      new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime(),
  );

  // Look up covers and ISBNs from Open Library
  console.log(`Looking up covers and ISBNs for ${books.length} books...`);
  let covers = 0;
  let isbns = 0;
  for (const book of books) {
    const result = await lookupBook(book.title, book.author, book.isbn);
    if (result.coverUrl) {
      book.coverUrl = result.coverUrl;
      covers++;
    }
    if (result.isbn && !book.isbn) {
      book.isbn = result.isbn;
      isbns++;
    }
    process.stdout.write(`\r  ${covers} covers, ${isbns} ISBNs found...`);
    await wait(DELAY_MS);
  }
  console.log(`\n  ${covers}/${books.length} covers, ${isbns} new ISBNs found.`);

  // Fallback: try Google Books for any still missing a cover
  const missing = books.filter((b) => !b.coverUrl);
  if (missing.length > 0) {
    console.log(`Trying Google Books for ${missing.length} missing covers...`);
    let gCovers = 0;
    for (const book of missing) {
      const coverUrl = await googleBooksCover(book.title, book.author);
      if (coverUrl) {
        book.coverUrl = coverUrl;
        gCovers++;
      }
      await wait(DELAY_MS);
    }
    console.log(`  ${gCovers} additional covers from Google Books.`);
    covers += gCovers;
    console.log(`  Total: ${covers}/${books.length} covers.`);
  }

  const outPath = join(__dirname, "..", "data", "books.json");
  writeFileSync(outPath, JSON.stringify(books, null, 2) + "\n");
  console.log(`Wrote ${books.length} books to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
