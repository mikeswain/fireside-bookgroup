/**
 * Read/write JSON files via the GitHub Contents API.
 * Used by the admin API to commit changes that trigger a Cloudflare Pages rebuild.
 */

import type { Book } from "./types";

const REPO = process.env.GITHUB_REPO ?? ""; // e.g. "owner/repo"
const BRANCH = process.env.GITHUB_BRANCH ?? "main";

function apiUrl(path: string): string {
  return `https://api.github.com/repos/${REPO}/contents/${path}`;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

interface FetchJsonResult<T> {
  data: T;
  sha: string;
}

/** Fetch a JSON file from the repo. Returns the parsed data and the file SHA (for optimistic locking). */
export async function fetchJsonFile<T>(token: string, path: string): Promise<FetchJsonResult<T>> {
  const url = `${apiUrl(path)}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { content: string; sha: string };
  const decoded = atob(json.content.replace(/\n/g, ""));
  const data = JSON.parse(decoded) as T;
  return { data, sha: json.sha };
}

/** Commit a JSON file to the repo. Uses SHA for optimistic locking (409 on conflict). */
export async function commitJsonFile<T>(
  token: string,
  path: string,
  data: T,
  sha: string,
  message: string,
): Promise<void> {
  const content = btoa(JSON.stringify(data, null, 2) + "\n");
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ message, content, sha, branch: BRANCH }),
  });
  if (!res.ok) {
    throw new Error(`GitHub commit failed ${res.status}: ${await res.text()}`);
  }
}

// Convenience wrappers for books.json
const BOOKS_PATH = "data/books.json";

export async function fetchBooks(token: string): Promise<{ books: Book[]; sha: string }> {
  const { data, sha } = await fetchJsonFile<Book[]>(token, BOOKS_PATH);
  return { books: data, sha };
}

export async function commitBooks(
  token: string,
  books: Book[],
  sha: string,
  message: string,
): Promise<void> {
  return commitJsonFile(token, BOOKS_PATH, books, sha, message);
}
