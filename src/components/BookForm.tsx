"use client";

import { useState } from "react";
import type { Book } from "@/lib/types";

const MEMBERS = [
  "Annie", "Bryan", "Cat", "Chris", "Derek", "Diane",
  "Jackie", "Jenny", "Joe", "Kate", "Kathryn",
  "Michael F", "Mike", "Mike B", "Mike S",
  "Sandra", "Steve", "Val",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface BookFormProps {
  book?: Book;
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
}

export default function BookForm({ book, onSave, onCancel }: BookFormProps) {
  const currentYear = new Date().getFullYear();

  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [proposer, setProposer] = useState(book?.proposer ?? "");
  const [month, setMonth] = useState(book?.month ?? 0);
  const [year, setYear] = useState(book?.year ?? currentYear);
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ title, author, proposer, month, year, isbn });
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

      <div>
        <label className={labelClass}>Proposer</label>
        <select
          value={proposer}
          onChange={(e) => setProposer(e.target.value)}
          className={inputClass}
          disabled={saving}
        >
          <option value="">— select —</option>
          {MEMBERS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
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

      {month > 0 && year > 0 && (
        <p className="text-xs text-amber-600">
          Meeting date: third Tuesday of {MONTHS[month - 1]} {year}
        </p>
      )}

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

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : book ? "Update Book" : "Add Book"}
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
          Looking up cover image and committing to GitHub&hellip; this may take a few seconds.
        </p>
      )}
    </form>
  );
}
