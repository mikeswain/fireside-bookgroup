import type { BookEvent } from "@/lib/types";

function EventCard({ event }: { event: BookEvent }) {
  const date = new Date(event.eventDate);
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

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-800">
        {event.bookTitle}
      </h3>
      <p className="mt-1 text-sm text-stone-600">
        {formatted} at {time}
      </p>
      <p className="mt-1 text-sm text-stone-500">
        Proposed by <span className="font-medium">{event.proposer}</span>
      </p>
      {event.isbn && (
        <p className="mt-1 text-xs text-stone-400">ISBN: {event.isbn}</p>
      )}
    </div>
  );
}

interface EventListProps {
  events: BookEvent[];
}

export default function EventList({ events }: EventListProps) {
  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.eventDate) >= now)
    .sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
  const past = events
    .filter((e) => new Date(e.eventDate) < now)
    .sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-bold text-stone-700">
          Upcoming Events
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-400">No upcoming events.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xl font-bold text-stone-700">
            Past Events
            <span className="ml-2 text-sm font-normal text-stone-400">
              ({past.length})
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
