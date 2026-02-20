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

  const dated = books.filter((b) => b.meetingDate);
  const undated = books.filter((b) => !b.meetingDate);

  const upcoming = dated
    .filter((b) => new Date(b.meetingDate!) >= now)
    .sort(
      (a, b) =>
        new Date(a.meetingDate!).getTime() - new Date(b.meetingDate!).getTime(),
    )
    .slice(0, 6);

  const past = dated
    .filter((b) => new Date(b.meetingDate!) < now)
    .sort(
      (a, b) =>
        new Date(b.meetingDate!).getTime() - new Date(a.meetingDate!).getTime(),
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
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
        <a
          href="/admin"
          className="absolute top-3 right-3 rounded-md bg-amber-900/40 px-3 py-1 text-xs font-medium text-amber-200/80 backdrop-blur-sm hover:bg-amber-900/60 hover:text-amber-100"
        >
          Admin
        </a>
        <p className="absolute bottom-2 right-3 text-xs text-amber-200/60">
          Updated {lastUpdated}
        </p>
      </div>
      <section className="mb-10 rounded-xl border border-amber-200/60 bg-amber-50/80 p-6 backdrop-blur-sm">
        <h2 className="mb-3 text-xl font-bold text-amber-900">About Us</h2>
        <div className="space-y-3 text-sm leading-relaxed text-amber-800/90">
          <p>
            We&apos;re a friendly bunch of book lovers who meet on the third
            Tuesday of each month at 7:30pm in the{" "}
            <a
              href="https://en.wikipedia.org/wiki/Puhoi"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-900 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-500"
            >
              Puhoi Town Library
            </a>{" "}
            &mdash; quite possibly New Zealand&apos;s most charming (and
            smallest) library. Built in 1913, it&apos;s survived floods, wars,
            and the occasional vigorous literary debate.
          </p>
          <p>
            Each month, one of us picks a book for the group to read. Choices
            range from Booker Prize winners to books nobody else has heard of
            (we&apos;re looking at you, <em>Max Havelaar</em>). There are no
            wrong answers, though turning up without having read the book is
            frowned upon &mdash; unless you bring good wine, in which case
            all is forgiven.
          </p>
          <p>
            We&apos;ve been going for more years than we care to count and
            have worked our way through well over a hundred books together.
            New members are always welcome &mdash; just bring a love of
            reading and a willingness to have your taste gently questioned.
          </p>
        </div>
      </section>

      <BookList upcoming={upcoming} past={past} undated={undated} />
    </main>
  );
}
