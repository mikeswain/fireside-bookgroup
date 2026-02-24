"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book, Member } from "@/lib/types";
import { displayName } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MessageData {
  sender: Member;
  recipients: Member[];
  nextBook: Book | null;
}

export default function MessageForm() {
  const [data, setData] = useState<MessageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [removedEmails, setRemovedEmails] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/message-data");
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <p className="text-sm text-amber-600">Loading...</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error || "Failed to load"}</p>
        <button onClick={fetchData} className="mt-2 text-sm font-medium text-red-800 underline">
          Retry
        </button>
      </div>
    );
  }

  const activeRecipients = data.recipients.filter(
    (m) => !removedEmails.has(m.email!),
  );
  const removedRecipients = data.recipients.filter((m) =>
    removedEmails.has(m.email!),
  );

  const handleRemove = (email: string) => {
    setRemovedEmails((prev) => new Set([...prev, email]));
  };

  const handleAdd = (email: string) => {
    setRemovedEmails((prev) => {
      const next = new Set(prev);
      next.delete(email);
      return next;
    });
  };

  const handlePrefill = () => {
    const book = data.nextBook;
    if (!book) return;

    const date = book.meetingDate ? new Date(book.meetingDate) : null;
    const monthName = date
      ? MONTHS[date.getMonth()]
      : book.month
        ? MONTHS[book.month - 1]
        : "";

    setSubject(`Reminder: ${monthName} book is ${book.title} by ${book.author ?? "TBC"}`);

    const dayName = date
      ? date.toLocaleDateString("en-NZ", { weekday: "short", timeZone: "Pacific/Auckland" })
      : "";
    const dayNum = date
      ? date.toLocaleDateString("en-NZ", { day: "numeric", timeZone: "Pacific/Auckland" })
      : "";
    const dateLine = date ? `We meet on ${dayName} ${dayNum} ${monthName} at 7:30pm.` : "";

    const lines = [
      "Hi everyone,",
      "",
      `Our next book is "${book.title}"${book.author ? ` by ${book.author}` : ""}.${book.proposer ? ` Chosen by ${book.proposer}.` : ""}`,
    ];
    if (dateLine) lines.push(dateLine);

    setBody(lines.join("\n"));
    setSent(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required");
      return;
    }
    if (!activeRecipients.length) {
      setError("At least one recipient is required");
      return;
    }

    setSending(true);
    setError("");
    setSent(null);

    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipientEmails: activeRecipients.map((m) => m.email!),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Send failed");
      }
      const json = await res.json();
      setSent(json.sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-amber-300/60 bg-white px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40";
  const labelClass = "block text-sm font-medium text-amber-800 mb-1";

  return (
    <div className="rounded-xl border border-amber-200/60 bg-amber-50/80 p-6">
      <p className="mb-4 text-sm text-amber-700">
        Sending as <strong>{displayName(data.sender)}</strong>
      </p>

      {data.nextBook && (
        <button
          type="button"
          onClick={handlePrefill}
          className="mb-5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
        >
          + Prefill as Book Reminder Message
        </button>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className={labelClass}>To:</label>
          <div className="flex flex-wrap gap-2">
            {activeRecipients.map((m) => (
              <span
                key={m.email}
                className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-3 py-1 text-sm text-amber-900"
              >
                {displayName(m)}
                <button
                  type="button"
                  onClick={() => handleRemove(m.email!)}
                  className="ml-0.5 text-amber-600 hover:text-amber-900"
                  aria-label={`Remove ${displayName(m)}`}
                >
                  &times;
                </button>
              </span>
            ))}
            {removedRecipients.length > 0 && (
              <AddRecipientDropdown
                removed={removedRecipients}
                onAdd={handleAdd}
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
            disabled={sending}
          />
        </div>

        <div>
          <label className={labelClass}>Message:</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className={inputClass}
            disabled={sending}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={sending || !activeRecipients.length}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : `Send to ${activeRecipients.length} Member${activeRecipients.length === 1 ? "" : "s"}`}
        </button>

        {sent !== null && (
          <p className="text-sm font-medium text-green-700">
            Message sent to {sent} member{sent === 1 ? "" : "s"}
          </p>
        )}
      </form>
    </div>
  );
}

function AddRecipientDropdown({
  removed,
  onAdd,
}: {
  removed: Member[];
  onAdd: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-full border border-dashed border-amber-400 px-3 py-1 text-sm text-amber-700 hover:bg-amber-100"
      >
        + Add
      </button>
      {open && (
        <div className="absolute top-full left-0 z-10 mt-1 rounded-lg border border-amber-200 bg-white py-1 shadow-lg">
          {removed.map((m) => (
            <button
              key={m.email}
              type="button"
              onClick={() => {
                onAdd(m.email!);
                setOpen(false);
              }}
              className="block w-full px-4 py-1.5 text-left text-sm text-amber-900 hover:bg-amber-50"
            >
              {displayName(m)}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
