"use client";

import { useState, useMemo, type ReactNode } from "react";
import type { Book } from "@/lib/types";

type TitledBook = Book & { title: string; };

function isTitled(book: Book): book is TitledBook {
  return !!book.title;
}

function bookSearchUrl(book: TitledBook): string {
  if (book.isbn) {
    return `https://openlibrary.org/isbn/${book.isbn.replace(/[-\s]/g, "")}`;
  }
  const q = book.author ? `${book.title} ${book.author}` : book.title;
  return `https://bookhub.co.nz/catalog/search?utf8=%E2%9C%93&keyword=${encodeURIComponent(q)}&search_type=core%5Ekeyword`;
}

function formatDate(meetingDate: string) {
  const date = new Date(meetingDate);
  const formatted = date.toLocaleDateString("en-NZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Pacific/Auckland",
  });
  const time = date.toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Pacific/Auckland",
  });
  return { formatted, time };
}

/** Split text around case-insensitive matches, wrapping matches in a highlight span. */
function Highlight({ text, query }: { text: string; query: string; }): ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-amber-300/60 px-0.5">{part}</mark>
    ) : (
      part
    ),
  );
}
function DateBadge({ book }: { book: Book; }): ReactNode {
  const meetingDate = book?.meetingDate && new Date(book.meetingDate);
  const today = new Date();
  if (!!meetingDate && meetingDate.getTime() > today.getTime()) {
    const formatted = meetingDate.toLocaleDateString("en-NZ", {
      year: meetingDate.getFullYear() > today.getFullYear() ? "numeric" : undefined,
      month: "long",
    });
    return <span className="rounded-full bg-amber-700/80 text-amber-100 text-sm p-2 h-fit font-bold text-nowrap">
      {formatted}
    </span>;
  }
  else
    return undefined;


}

function bookMatchesQuery(book: Book, query: string): boolean {
  const q = query.toLowerCase();
  return [book.title, book.author, book.proposer, book.isbn, book.title ? null : "to be confirmed"]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}

function FeaturedCard({ book, query }: { book: TitledBook; query: string; }) {
  const { formatted, time } = formatDate(book.meetingDate!);

  return (
    <div className="rounded-xl border-2 border-amber-400/60 bg-amber-50 p-5 shadow-md">
      <div className="flex justify-between">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-600">
          This month&apos;s book
        </p>
        <DateBadge book={book} />
      </div>
      <div className="flex gap-5">
        {book.coverUrl && (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            className="h-36 w-24 shrink-0 rounded-lg object-cover shadow-sm"
          />
        )}
        <div>
          <h3 className="text-xl font-bold">
            <a
              href={bookSearchUrl(book)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-900 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-500"
            >
              <Highlight text={book.title} query={query} />
            </a>
          </h3>
          {book.author && (
            <p className="mt-1 text-sm italic text-amber-700">
              <Highlight text={book.author} query={query} />
            </p>
          )}
          <p className="mt-2 text-sm text-amber-800/70">
            {formatted} at {time}
          </p>
          <p className="mt-1 text-sm text-amber-800/70">
            Proposed by{" "}
            <span className="font-medium text-amber-900">
              <Highlight text={book.proposer} query={query} />
            </span>
          </p>
          {book.isbn && (
            <p className="mt-1 text-xs text-amber-600/70">
              ISBN: <Highlight text={book.isbn} query={query} />
            </p>
          )}
        </div>
      </div>

    </div>
  );
}

function TBCCard({ book, query }: { book: Book; query: string; }) {
  const dateInfo = book.meetingDate ? formatDate(book.meetingDate) : null;

  return (
    <div className="flex gap-4 rounded-xl border-2 border-dashed border-amber-300/70 bg-amber-50/40 p-4 shadow-sm backdrop-blur-sm justify-around">
      <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-amber-300/60 bg-amber-100/40 text-4xl font-light text-amber-400">
        ?
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80">
          To be confirmed
        </p>
        <h3 className="mt-1 text-lg font-semibold italic text-amber-800/70">
          Book not yet chosen
        </h3>
        {dateInfo && (
          <p className="mt-2 text-sm text-amber-800/70">
            {dateInfo.formatted} at {dateInfo.time}
          </p>
        )}
        {book.proposer && (
          <p className="mt-1 text-sm text-amber-800/70">
            To be proposed by{" "}
            <span className="font-medium text-amber-900">
              <Highlight text={book.proposer} query={query} />
            </span>
          </p>
        )}
      </div>
      <DateBadge book={book} />
    </div>
  );
}

function BookCard({ book, query }: { book: TitledBook; query: string; }) {
  const dateInfo = book.meetingDate ? formatDate(book.meetingDate) : null;

  return (
    <div className="flex gap-4 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md justify-around">
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          className="h-28 w-20 shrink-0 rounded-lg object-cover shadow-sm"
        />
      )}
      <div>
        <h3 className="text-lg font-semibold">
          <a
            href={bookSearchUrl(book)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-900 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-500"
          >
            <Highlight text={book.title} query={query} />
          </a>
        </h3>
        {book.author && (
          <p className="mt-1 text-sm italic text-amber-700">
            <Highlight text={book.author} query={query} />
          </p>
        )}
        {dateInfo && (
          <p className="mt-1 text-sm text-amber-800/70">
            {dateInfo.formatted} at {dateInfo.time}
          </p>
        )}
        {book.proposer && (
          <p className="mt-1 text-sm text-amber-800/70">
            Proposed by{" "}
            <span className="font-medium text-amber-900">
              <Highlight text={book.proposer} query={query} />
            </span>
          </p>
        )}
        {book.isbn && (
          <p className="mt-1 text-xs text-amber-600/70">
            ISBN: <Highlight text={book.isbn} query={query} />
          </p>
        )}
      </div>
      <DateBadge book={book} />
    </div>
  );
}

export default function BookList({ books }: { books: Book[]; }) {
  const [query, setQuery] = useState("");

  const { upcoming, past, undated } = useMemo(() => {
    const now = new Date();
    const dated = books.filter((b) => b.meetingDate);
    return {
      upcoming: dated
        .filter((b) => new Date(b.meetingDate!) >= now)
        .sort((a, b) => new Date(a.meetingDate!).getTime() - new Date(b.meetingDate!).getTime()),
      past: dated
        .filter((b) => new Date(b.meetingDate!) < now)
        .sort((a, b) => new Date(b.meetingDate!).getTime() - new Date(a.meetingDate!).getTime()),
      undated: books.filter((b) => !b.meetingDate && b.title),
    };
  }, [books]);

  const renderCard = (q: string) => (b: Book) =>
    isTitled(b)
      ? <BookCard key={b.id} book={b} query={q} />
      : <TBCCard key={b.id} book={b} query={q} />;

  const filteredUpcoming = useMemo(
    () => (query ? upcoming.filter((b) => bookMatchesQuery(b, query)) : upcoming),
    [upcoming, query],
  );
  const filteredPast = useMemo(
    () => (query ? past.filter((b) => bookMatchesQuery(b, query)) : past),
    [past, query],
  );
  const filteredUndated = useMemo(
    () => (query ? undated.filter((b) => bookMatchesQuery(b, query)) : undated),
    [undated, query],
  );

  const totalMatches = filteredUpcoming.length + filteredPast.length + filteredUndated.length;

  return (
    <div className="space-y-10">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books by title, author, proposer, or ISBN..."
          className="w-full rounded-lg border border-amber-300/60 bg-amber-50/80 px-4 py-2.5 pl-10 text-sm text-amber-900 placeholder-amber-400 shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
        />
        <svg className="absolute left-3 top-2.5 h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {query && (
          <p className="mt-1.5 text-xs text-amber-600">
            {totalMatches} {totalMatches === 1 ? "match" : "matches"} found
          </p>
        )}
      </div>

      <section>
        <h2 className="flex justify-between items-baseline mb-4 border-b border-amber-300/50 pb-2 text-xl font-bold text-amber-900">
          Upcoming Books
          <a
            href="webcal:/events"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="md:inline text-xs">Add to your calendar</span>
          </a>
        </h2>
        {filteredUpcoming.length === 0 ? (
          <p className="text-sm text-amber-600">
            {query ? "No matching upcoming books." : "No upcoming books."}
          </p>
        ) : (
          <div className="space-y-4">
            {!query && isTitled(filteredUpcoming[0]) && (
              <FeaturedCard book={filteredUpcoming[0]} query={query} />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredUpcoming.slice(!query && filteredUpcoming[0].title ? 1 : 0).map(renderCard(query))}
            </div>
          </div>
        )}
      </section>

      {
        filteredPast.length > 0 && (
          <details open={!!query}>
            <summary className="cursor-pointer border-b border-amber-300/50 pb-2 text-xl font-bold text-amber-900">
              Past Books
              <span className="ml-2 text-sm font-normal text-amber-600">
                ({filteredPast.length})
              </span>
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {filteredPast.map(renderCard(query))}
            </div>
          </details>
        )
      }

      {
        filteredUndated.length > 0 && (
          <details open={!!query}>
            <summary className="cursor-pointer border-b border-amber-300/50 pb-2 text-xl font-bold text-amber-900">
              We Read These But Can&apos;t Remember When
              <span className="ml-2 text-sm font-normal text-amber-600">
                ({filteredUndated.length})
              </span>
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {filteredUndated.map(renderCard(query))}
            </div>
          </details>
        )
      }
    </div >
  );
}
