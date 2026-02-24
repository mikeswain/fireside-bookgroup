"use client";

import { useState, useEffect, useRef } from "react";
import type { Member } from "@/lib/types";
import { displayName } from "@/lib/types";

/** Where the nav is rendered — controls styling (translucent on hero, solid on inner pages). */
type Variant = "hero" | "page";

interface UserNavProps {
  variant: Variant;
  /** Which page we're on, so we don't show a link to the current page. */
  currentPage?: "home" | "messages" | "admin";
}

interface AuthState {
  member: Member | null;
  checked: boolean;
}

export default function UserNav({ variant, currentPage }: UserNavProps) {
  const [auth, setAuth] = useState<AuthState>({ member: null, checked: false });
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAuth({ member: data?.member ?? null, checked: true }))
      .catch(() => setAuth({ member: null, checked: true }));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!auth.checked) return null;

  const isHero = variant === "hero";
  const member = auth.member;

  // Button styles per variant
  const btnClass = isHero
    ? "rounded-md bg-amber-900/40 px-3 py-1 text-xs font-medium text-amber-200/80 backdrop-blur-sm hover:bg-amber-900/60 hover:text-amber-100"
    : "rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100";

  if (!member) {
    // Login triggers CF Access auth, then redirects back to the current page
    const loginUrl = `/api/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    return (
      <a href={loginUrl} className={btnClass}>
        Login
      </a>
    );
  }

  const name = displayName(member);

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      {currentPage !== "messages" && (
        <a href="/messages" className={btnClass}>
          Message Group
        </a>
      )}
      {member.isAdmin && currentPage !== "admin" && (
        <a href="/admin" className={btnClass}>
          Admin
        </a>
      )}

      {/* User avatar / dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            isHero
              ? "bg-amber-200/20 text-amber-200 backdrop-blur-sm hover:bg-amber-200/30"
              : "bg-amber-200 text-amber-800 hover:bg-amber-300"
          }`}
          aria-label="User menu"
          title={name}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-lg border border-amber-200 bg-white py-1 shadow-lg">
            <div className="border-b border-amber-100 px-4 py-2">
              <p className="text-sm font-medium text-amber-900">{name}</p>
            </div>
            <a
              href="/api/auth/logout"
              className="block px-4 py-2 text-sm text-amber-800 hover:bg-amber-50"
            >
              Logout
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
