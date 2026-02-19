"use client";

import { useEffect, useState } from "react";
import EventForm from "@/components/EventForm";
import EventList from "@/components/EventList";
import type { BookEvent } from "@/lib/types";
import { addEvent, getEvents, getMembers } from "@/lib/events";

export default function Home() {
  const [events, setEvents] = useState<BookEvent[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvents(), getMembers()]).then(([e, m]) => {
      setEvents(e);
      setMembers(m);
      setLoading(false);
    });
  }, []);

  const handleAddEvent = async (event: BookEvent) => {
    await addEvent(event);
    setEvents(await getEvents());
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-stone-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-stone-800">
        Puhoi Fireside Bookgroup
      </h1>

      <section className="mb-12 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-stone-700">
          Add Event
        </h2>
        <EventForm members={members} onSubmit={handleAddEvent} />
      </section>

      <EventList events={events} />
    </main>
  );
}
