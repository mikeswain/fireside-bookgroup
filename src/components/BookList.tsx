import type { Book } from "@/lib/types";

function bookSearchUrl(book: Book): string {
  if (book.isbn) {
    return `https://openlibrary.org/isbn/${book.isbn.replace(/[-\s]/g, "")}`;
  }
  const q = book.author ? `${book.title} ${book.author}` : book.title;
  return `https://openlibrary.org/search?q=${encodeURIComponent(q)}`;
}

function formatDate(meetingDate: string) {
  const date = new Date(meetingDate);
  const formatted = date.toLocaleDateString("en-NZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = date.toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { formatted, time };
}

function FeaturedCard({ book }: { book: Book }) {
  const { formatted, time } = formatDate(book.meetingDate);

  return (
    <div className="rounded-xl border-2 border-amber-400/60 bg-amber-50 p-5 shadow-md">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-600">
        This month&apos;s book
      </p>
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
              {book.title}
            </a>
          </h3>
          {book.author && (
            <p className="mt-1 text-sm italic text-amber-700">{book.author}</p>
          )}
          <p className="mt-2 text-sm text-amber-800/70">
            {formatted} at {time}
          </p>
          <p className="mt-1 text-sm text-amber-800/70">
            Proposed by{" "}
            <span className="font-medium text-amber-900">{book.proposer}</span>
          </p>
          {book.isbn && (
            <p className="mt-1 text-xs text-amber-600/70">
              ISBN: {book.isbn}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  const { formatted, time } = formatDate(book.meetingDate);

  return (
    <div className="flex gap-4 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
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
            {book.title}
          </a>
        </h3>
        {book.author && (
          <p className="mt-1 text-sm italic text-amber-700">{book.author}</p>
        )}
        <p className="mt-1 text-sm text-amber-800/70">
          {formatted} at {time}
        </p>
        <p className="mt-1 text-sm text-amber-800/70">
          Proposed by{" "}
          <span className="font-medium text-amber-900">{book.proposer}</span>
        </p>
        {book.isbn && (
          <p className="mt-1 text-xs text-amber-600/70">
            ISBN: {book.isbn}
          </p>
        )}
      </div>
    </div>
  );
}

interface BookListProps {
  upcoming: Book[];
  past: Book[];
}

export default function BookList({ upcoming, past }: BookListProps) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 border-b border-amber-300/50 pb-2 text-xl font-bold text-amber-900">
          Upcoming Books
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-amber-600">No upcoming books.</p>
        ) : (
          <div className="space-y-4">
            <FeaturedCard book={upcoming[0]} />
            {upcoming.length > 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.slice(1).map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer border-b border-amber-300/50 pb-2 text-xl font-bold text-amber-900">
            Past Books
            <span className="ml-2 text-sm font-normal text-amber-600">
              ({past.length})
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {past.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
