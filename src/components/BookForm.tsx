"use client";

import { useState } from "react";
import type { Book, Member } from "@/lib/types";
import { displayName } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface BookFormProps {
  book?: Book;
  members?: Member[];
  onSave: (data: BookFormData) => Promise<void>;
  onCancel: () => void;
}

export interface BookFormData {
  title: string;
  author: string;
  proposer: string;
  month: number;
  year: number;
  isbn: string;
  customDate?: string; // ISO date string override, or empty to use third Tuesday
}

/** Format an ISO date string as a local NZ datetime-local input value. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const nz = new Date(d.toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${nz.getFullYear()}-${pad(nz.getMonth() + 1)}-${pad(nz.getDate())}T${pad(nz.getHours())}:${pad(nz.getMinutes())}`;
}

export default function BookForm({ book, members = [], onSave, onCancel }: BookFormProps) {
  const currentYear = new Date().getFullYear();

  const [tbc, setTbc] = useState(book ? !book.title : false);
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [proposer, setProposer] = useState(book?.proposer ?? "");
  const [month, setMonth] = useState(book?.month ?? 0);
  const [year, setYear] = useState(book?.year ?? currentYear);
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState(
    book?.meetingDate ? toDatetimeLocal(book.meetingDate) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tbc) {
      if (!proposer.trim()) {
        setError("Proposer is required for a 'to be confirmed' slot");
        return;
      }
      if (!month || !year) {
        setError("Month and year are required for a 'to be confirmed' slot");
        return;
      }
    } else if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: tbc ? "" : title,
        author: tbc ? "" : author,
        proposer,
        month,
        year,
        isbn: tbc ? "" : isbn,
        customDate: useCustomDate && customDate ? customDate : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-amber-300/60 bg-white px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40";
  const labelClass = "block text-sm font-medium text-amber-800 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-amber-800">
        <input
          type="checkbox"
          checked={tbc}
          onChange={(e) => setTbc(e.target.checked)}
          disabled={saving}
          className="rounded border-amber-300"
        />
        Book to be confirmed (reserve the slot without choosing a book yet)
      </label>

      {!tbc && (
        <>
          <div>
            <label className={labelClass}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </div>

          <div>
            <label className={labelClass}>Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </div>
        </>
      )}

      <div>
        <label className={labelClass}>
          Proposer{tbc && <span className="text-red-500"> *</span>}
        </label>
        <select
          value={proposer}
          onChange={(e) => setProposer(e.target.value)}
          className={inputClass}
          disabled={saving}
        >
          <option value="">— select —</option>
          {members.map((m) => {
            const name = displayName(m);
            return <option key={name} value={name}>{name}</option>;
          })}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={inputClass}
            disabled={saving}
          >
            <option value={0}>— none —</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2030}
            className={inputClass}
            disabled={saving}
          />
        </div>
      </div>

      {month > 0 && year > 0 && !useCustomDate && (
        <p className="text-xs text-amber-600">
          Meeting date: third Tuesday of {MONTHS[month - 1]} {year}
        </p>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm text-amber-800">
          <input
            type="checkbox"
            checked={useCustomDate}
            onChange={(e) => setUseCustomDate(e.target.checked)}
            disabled={saving}
            className="rounded border-amber-300"
          />
          Custom date/time
        </label>
        {useCustomDate && (
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className={`${inputClass} mt-2`}
            disabled={saving}
          />
        )}
      </div>

      {!tbc && (
        <div>
          <label className={labelClass}>ISBN</label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="Optional — looked up automatically"
            className={inputClass}
            disabled={saving}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : book ? "Update" : tbc ? "Add Slot" : "Add Book"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {saving && (
        <p className="text-xs text-amber-600">
          {tbc
            ? "Committing to GitHub\u2026 this may take a few seconds."
            : "Looking up cover image and committing to GitHub\u2026 this may take a few seconds."}
        </p>
      )}
    </form>
  );
}
