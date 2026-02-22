"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book, Member } from "@/lib/types";
import BookForm, { type BookFormData } from "./BookForm";

type SortField = "title" | "author" | "proposer" | "date";

export default function AdminBookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [sha, setSha] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchAllBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [booksRes, membersRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/members"),
      ]);
      if (!booksRes.ok) throw new Error(`Failed to load books: ${booksRes.status}`);
      const booksData = await booksRes.json();
      setBooks(booksData.books);
      setSha(booksData.sha);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllBooks();
  }, [fetchAllBooks]);

  const handleAdd = async (data: BookFormData) => {
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sha }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to add book");
    }
    setAdding(false);
    await fetchAllBooks();
  };

  const handleUpdate = async (book: Book, data: BookFormData) => {
    const res = await fetch("/api/books", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: book.id, ...data, sha }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to update book");
    }
    setEditingId(null);
    await fetchAllBooks();
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Delete "${book.title}"? This will commit the change to GitHub.`)) {
      return;
    }
    setDeletingId(book.id);
    setError("");
    try {
      const res = await fetch("/api/books", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: book.id, sha }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete book");
      }
      await fetchAllBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedBooks = [...books]
    .filter((b) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [b.title, b.author, b.proposer, b.isbn]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortField) {
        case "title":
          return dir * a.title.localeCompare(b.title);
        case "author":
          return dir * (a.author ?? "").localeCompare(b.author ?? "");
        case "proposer":
          return dir * a.proposer.localeCompare(b.proposer);
        case "date": {
          if (!a.meetingDate && !b.meetingDate) return 0;
          if (!a.meetingDate) return 1;
          if (!b.meetingDate) return -1;
          return dir * (new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
        }
      }
    });

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-amber-800 hover:text-amber-950"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortField === field && (
        <span className="ml-1">{sortAsc ? "\u25b2" : "\u25bc"}</span>
      )}
    </th>
  );

  if (loading) {
    return <p className="text-sm text-amber-600">Loading books from GitHub...</p>;
  }

  if (error && books.length === 0) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchAllBooks}
          className="mt-2 text-sm font-medium text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Add book form */}
      {adding ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-5">
          <h2 className="mb-4 text-lg font-bold text-amber-900">Add Book</h2>
          <BookForm members={members} onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setEditingId(null); setAdding(true); }}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            + Add Book
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter books..."
            className="flex-1 rounded-lg border border-amber-300/60 bg-white px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
          />
          <span className="text-sm text-amber-600">
            {sortedBooks.length} book{sortedBooks.length !== 1 && "s"}
          </span>
        </div>
      )}

      {/* Books table */}
      <div className="overflow-x-auto rounded-xl border border-amber-200/60">
        <table className="w-full text-left">
          <thead className="border-b border-amber-200/60 bg-amber-50/80">
            <tr>
              <SortHeader field="title" label="Title" />
              <SortHeader field="author" label="Author" />
              <SortHeader field="proposer" label="Proposer" />
              <SortHeader field="date" label="Date" />
              <th className="px-3 py-2 text-sm font-medium text-amber-800">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {sortedBooks.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                members={members}
                isEditing={editingId === book.id}
                isDeleting={deletingId === book.id}
                onEdit={() => { setAdding(false); setEditingId(book.id); }}
                onCancelEdit={() => setEditingId(null)}
                onSave={(data) => handleUpdate(book, data)}
                onDelete={() => handleDelete(book)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface BookRowProps {
  book: Book;
  members: Member[];
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: BookFormData) => Promise<void>;
  onDelete: () => void;
}

function BookRow({ book, members, isEditing, isDeleting, onEdit, onCancelEdit, onSave, onDelete }: BookRowProps) {
  return (
    <>
      <tr className={isEditing ? "bg-amber-50" : "hover:bg-amber-50/50"}>
        <td className="px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            {book.coverUrl && (
              <img
                src={book.coverUrl}
                alt=""
                className="h-8 w-6 shrink-0 rounded object-cover"
              />
            )}
            <span className="font-medium text-amber-900">{book.title}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-amber-700">
          {book.author ?? "\u2014"}
        </td>
        <td className="px-3 py-2 text-sm text-amber-700">
          {book.proposer || "\u2014"}
        </td>
        <td className="px-3 py-2 text-sm text-amber-700">
          {book.meetingDate
            ? new Date(book.meetingDate).toLocaleDateString("en-NZ", {
                month: "short",
                year: "numeric",
              })
            : "\u2014"}
        </td>
        <td className="px-3 py-2 text-sm">
          <div className="flex gap-2">
            <button
              onClick={isEditing ? onCancelEdit : onEdit}
              className="text-amber-700 hover:text-amber-900"
              disabled={isDeleting}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-800"
              disabled={isDeleting}
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          </div>
        </td>
      </tr>
      {isEditing && (
        <tr>
          <td colSpan={5} className="border-t border-amber-200/40 bg-amber-50/80 px-4 py-4">
            <BookForm book={book} members={members} onSave={onSave} onCancel={onCancelEdit} />
          </td>
        </tr>
      )}
    </>
  );
}
