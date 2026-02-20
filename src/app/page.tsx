import { statSync } from "fs";
import { join } from "path";
import BookList from "@/components/BookList";
import { getBooks } from "@/lib/books";

export default function Home() {
  const now = new Date();
  const books = getBooks();
  const lastUpdated = statSync(
    join(process.cwd(), "data", "books.json"),
  ).mtime.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const upcoming = books
    .filter((b) => new Date(b.meetingDate) >= now)
    .sort(
      (a, b) =>
        new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime(),
    )
    .slice(0, 6);

  const past = books
    .filter((b) => new Date(b.meetingDate) < now)
    .sort(
      (a, b) =>
        new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime(),
    );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="relative mb-10 overflow-hidden rounded-xl shadow-lg">
        <img
          src="/hero.jpg"
          alt="Bookshelves filled with books"
          className="h-56 w-full object-cover brightness-90"
        />
        <div className="absolute inset-0 flex items-center gap-5 bg-gradient-to-r from-amber-950/70 via-amber-950/40 to-transparent px-8">
          <img
            src="/library.jpg"
            alt="Puhoi Town Library"
            className="h-28 w-28 shrink-0 rounded-full border-3 border-amber-200/60 object-cover shadow-lg"
          />
          <div>
            <h1 className="text-3xl font-bold text-amber-50 drop-shadow-lg sm:text-4xl">
              Puhoi Fireside Bookgroup
            </h1>
            <p className="mt-1 text-sm text-amber-200/80">
              Good books, good company, good wine
            </p>
          </div>
        </div>
        <p className="absolute bottom-2 right-3 text-xs text-amber-200/60">
          Updated {lastUpdated}
        </p>
      </div>
      <BookList upcoming={upcoming} past={past} />
    </main>
  );
}
