"use client";

import { useState, useEffect, useCallback } from "react";
import type { Member } from "@/lib/types";
import { displayName } from "@/lib/types";

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [sha, setSha] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const memberKey = (m: Member) => `${m.givenName}|${m.familyName}`;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error(`Failed to load members: ${res.status}`);
      const data = await res.json();
      setMembers(data.members);
      setSha(data.sha);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async (data: MemberFormData) => {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sha }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to add member");
    }
    setAdding(false);
    await fetchMembers();
  };

  const handleUpdate = async (original: Member, data: MemberFormData) => {
    const res = await fetch("/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalGivenName: original.givenName,
        originalFamilyName: original.familyName,
        ...data,
        sha,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to update member");
    }
    setEditingKey(null);
    await fetchMembers();
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`Delete "${displayName(member)}"? This will commit the change to GitHub.`)) {
      return;
    }
    const key = memberKey(member);
    setDeletingKey(key);
    setError("");
    try {
      const res = await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          givenName: member.givenName,
          familyName: member.familyName,
          sha,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete member");
      }
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingKey(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-amber-600">Loading members from GitHub...</p>;
  }

  if (error && members.length === 0) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={fetchMembers} className="mt-2 text-sm font-medium text-red-800 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-5">
          <h3 className="mb-4 text-lg font-bold text-amber-900">Add Member</h3>
          <MemberForm onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button
          onClick={() => { setEditingKey(null); setAdding(true); }}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          + Add Member
        </button>
      )}

      <div className="overflow-x-auto rounded-xl border border-amber-200/60">
        <table className="w-full text-left">
          <thead className="border-b border-amber-200/60 bg-amber-50/80">
            <tr>
              <th className="px-3 py-2 text-sm font-medium text-amber-800">Given Name</th>
              <th className="px-3 py-2 text-sm font-medium text-amber-800">Family Name</th>
              <th className="px-3 py-2 text-sm font-medium text-amber-800">Display</th>
              <th className="px-3 py-2 text-sm font-medium text-amber-800">Email</th>
              <th className="px-3 py-2 text-sm font-medium text-amber-800">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {members.map((member) => {
              const key = memberKey(member);
              const isEditing = editingKey === key;
              const isDeleting = deletingKey === key;
              return (
                <MemberRow
                  key={key}
                  member={member}
                  isEditing={isEditing}
                  isDeleting={isDeleting}
                  onEdit={() => { setAdding(false); setEditingKey(key); }}
                  onCancelEdit={() => setEditingKey(null)}
                  onSave={(data) => handleUpdate(member, data)}
                  onDelete={() => handleDelete(member)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MemberFormData {
  givenName: string;
  familyName: string;
  email: string;
}

interface MemberFormProps {
  member?: Member;
  onSave: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
}

function MemberForm({ member, onSave, onCancel }: MemberFormProps) {
  const [givenName, setGivenName] = useState(member?.givenName ?? "");
  const [familyName, setFamilyName] = useState(member?.familyName ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!givenName.trim()) {
      setError("Given name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ givenName, familyName, email });
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Given Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
            className={inputClass}
            disabled={saving}
          />
        </div>
        <div>
          <label className={labelClass}>Family Name</label>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className={inputClass}
            disabled={saving}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          disabled={saving}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : member ? "Update Member" : "Add Member"}
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
    </form>
  );
}

interface MemberRowProps {
  member: Member;
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: MemberFormData) => Promise<void>;
  onDelete: () => void;
}

function MemberRow({ member, isEditing, isDeleting, onEdit, onCancelEdit, onSave, onDelete }: MemberRowProps) {
  return (
    <>
      <tr className={isEditing ? "bg-amber-50" : "hover:bg-amber-50/50"}>
        <td className="px-3 py-2 text-sm font-medium text-amber-900">{member.givenName}</td>
        <td className="px-3 py-2 text-sm text-amber-700">{member.familyName || "\u2014"}</td>
        <td className="px-3 py-2 text-sm text-amber-600">{displayName(member)}</td>
        <td className="px-3 py-2 text-sm text-amber-700">{member.email || "\u2014"}</td>
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
            <MemberForm member={member} onSave={onSave} onCancel={onCancelEdit} />
          </td>
        </tr>
      )}
    </>
  );
}
