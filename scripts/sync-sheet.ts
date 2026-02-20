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
import { lookupBook, googleBooksCover, bookhubCover } from "../src/lib/covers";

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

const BATCH_SIZE = 10; // concurrent requests per batch

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

    const book: Book = {
      id: stableId(year || 0, monthNum, title),
      proposer: proposer ?? "",
      title,
      author: author || undefined,
      isbn: isbn || undefined,
    };

    if (meetingDate) {
      book.meetingDate = meetingDate.toISOString();
      book.month = monthNum;
      book.year = year;
    }

    books.push(book);
  }

  // Dated books first (sorted by date), then undated at the end
  books.sort((a, b) => {
    if (!a.meetingDate && !b.meetingDate) return 0;
    if (!a.meetingDate) return 1;
    if (!b.meetingDate) return -1;
    return new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
  });

  // Look up covers and ISBNs from Open Library (in batches)
  console.log(`Looking up covers and ISBNs for ${books.length} books (${BATCH_SIZE} at a time)...`);
  let covers = 0;
  let isbns = 0;
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((book) => lookupBook(book.title, book.author, book.isbn)),
    );
    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.coverUrl) {
        batch[j].coverUrl = result.coverUrl;
        covers++;
      }
      if (result.isbn && !batch[j].isbn) {
        batch[j].isbn = result.isbn;
        isbns++;
      }
    }
    process.stdout.write(`\r  ${i + batch.length}/${books.length} — ${covers} covers, ${isbns} ISBNs`);
  }
  console.log(`\n  ${covers}/${books.length} covers, ${isbns} new ISBNs found.`);

  // Fallback: try Google Books for any still missing a cover (in batches)
  const missing = books.filter((b) => !b.coverUrl);
  if (missing.length > 0) {
    console.log(`Trying Google Books for ${missing.length} missing covers (${BATCH_SIZE} at a time)...`);
    let gCovers = 0;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((book) => googleBooksCover(book.title, book.author)),
      );
      for (let j = 0; j < batch.length; j++) {
        if (results[j]) {
          batch[j].coverUrl = results[j];
          gCovers++;
        }
      }
    }
    console.log(`  ${gCovers} additional covers from Google Books.`);
    covers += gCovers;
    console.log(`  Total: ${covers}/${books.length} covers.`);
  }

  // Fallback: try BookHub NZ for any still missing a cover (in batches)
  const missingNz = books.filter((b) => !b.coverUrl);
  if (missingNz.length > 0) {
    console.log(`Trying BookHub NZ for ${missingNz.length} missing covers (${BATCH_SIZE} at a time)...`);
    let bhCovers = 0;
    for (let i = 0; i < missingNz.length; i += BATCH_SIZE) {
      const batch = missingNz.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((book) => bookhubCover(book.title, book.author)),
      );
      for (let j = 0; j < batch.length; j++) {
        if (results[j]) {
          batch[j].coverUrl = results[j];
          bhCovers++;
        }
      }
    }
    console.log(`  ${bhCovers} additional covers from BookHub NZ.`);
    covers += bhCovers;
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
