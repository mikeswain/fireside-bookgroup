"use client";

import { useState, useEffect } from "react";
import { getFirstTuesday, getNextMonth } from "@/lib/dates";
import type { BookEvent } from "@/lib/types";

interface EventFormProps {
  members: string[];
  onSubmit: (event: BookEvent) => Promise<void>;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({ members, onSubmit }: EventFormProps) {
  const next = getNextMonth();
  const [proposer, setProposer] = useState(members[0] ?? "");
  const [month, setMonth] = useState(next.month);
  const [year, setYear] = useState(next.year);
  const [eventDate, setEventDate] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEventDate(toDatetimeLocal(getFirstTuesday(month, year)));
  }, [month, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const event: BookEvent = {
      id: crypto.randomUUID(),
      proposer,
      dateEntered: new Date().toISOString().slice(0, 10),
      eventDate: new Date(eventDate).toISOString(),
      month,
      year,
      bookTitle,
      isbn: isbn || undefined,
    };
    await onSubmit(event);
    setBookTitle("");
    setIsbn("");
    setSubmitting(false);
  };

  const inputClass =
    "rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Proposer</span>
          <select
            value={proposer}
            onChange={(e) => setProposer(e.target.value)}
            className={inputClass}
          >
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Book Title</span>
          <input
            type="text"
            required
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString("en", { month: "long" })}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Year</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2040}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Event Date & Time</span>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">ISBN (optional)</span>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-amber-600 px-6 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add Event"}
      </button>
    </form>
  );
}
