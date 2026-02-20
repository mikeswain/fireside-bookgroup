/**
 * Cover image lookup functions shared by the sync script and API routes.
 * Tries Open Library, Google Books, and BookHub NZ in sequence.
 */

const MIN_COVER_BYTES = 1000;

/** Check a cover URL is a real image (not a tiny placeholder). */
async function isValidCover(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return false;
    const cl = Number(res.headers.get("content-length") || "0");
    if (cl > MIN_COVER_BYTES) return true;
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
export async function lookupBook(
  title: string,
  author?: string,
  knownIsbn?: string,
): Promise<OpenLibraryResult> {
  if (knownIsbn) {
    const cleaned = knownIsbn.replace(/[-\s]/g, "");
    const url = `https://covers.openlibrary.org/b/isbn/${cleaned}-M.jpg`;
    if (await isValidCover(url)) {
      return { coverUrl: url, isbn: knownIsbn };
    }
  }

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

    const isbn13 = doc.isbn?.find((i) => i.length === 13);
    result.isbn = knownIsbn || isbn13 || doc.isbn?.[0];

    if (doc.cover_i) {
      result.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (doc.isbn?.[0]) {
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
      if (await isValidCover(coverUrl)) result.coverUrl = coverUrl;
    }

    return result;
  } catch {
    // Non-fatal
  }
  return {};
}

/** Fallback: try Google Books API for a cover image. */
export async function googleBooksCover(
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

/** Extract cover from BookHub search results HTML. */
function extractBookhubCover(html: string): string | undefined {
  const match = html.match(
    /data-original="(https:\/\/storage\.googleapis\.com\/circlesoft[^"]+)"/,
  );
  return match?.[1];
}

/** Fallback: try BookHub NZ for a cover image. Tries title+author, then title only. */
export async function bookhubCover(
  title: string,
  author?: string,
): Promise<string | undefined> {
  const searches = author ? [`${title} ${author}`, title] : [title];

  try {
    for (const keyword of searches) {
      const searchUrl = `https://bookhub.co.nz/catalog/search?utf8=%E2%9C%93&keyword=${encodeURIComponent(keyword)}&search_type=core%5Ekeyword`;
      const res = await fetch(searchUrl);
      if (!res.ok) continue;
      const coverUrl = extractBookhubCover(await res.text());
      if (coverUrl && (await isValidCover(coverUrl))) return coverUrl;
    }
    return undefined;
  } catch {
    // Non-fatal
  }
  return undefined;
}

/**
 * Find a cover image for a book, trying all sources in order:
 * Open Library → Google Books → BookHub NZ.
 * Also returns ISBN if found.
 */
export async function findCover(
  title: string,
  author?: string,
  isbn?: string,
): Promise<{ coverUrl?: string; isbn?: string }> {
  // Try Open Library first (also finds ISBNs)
  const ol = await lookupBook(title, author, isbn);
  if (ol.coverUrl) return ol;

  // Try Google Books
  const gCover = await googleBooksCover(title, author);
  if (gCover) return { coverUrl: gCover, isbn: ol.isbn };

  // Try BookHub NZ
  const bhCover = await bookhubCover(title, author);
  if (bhCover) return { coverUrl: bhCover, isbn: ol.isbn };

  // No cover found, but may have ISBN from Open Library
  return { isbn: ol.isbn };
}
