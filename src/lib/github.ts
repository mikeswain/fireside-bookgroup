/**
 * Read/write data/books.json via the GitHub Contents API.
 * Used by the admin API to commit changes that trigger a Cloudflare Pages rebuild.
 */

import type { Book } from "./types";

const REPO = process.env.GITHUB_REPO ?? ""; // e.g. "owner/repo"
const BRANCH = process.env.GITHUB_BRANCH ?? "main";
const FILE_PATH = "data/books.json";

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

interface FetchBooksResult {
  books: Book[];
  sha: string;
}

/** Fetch books.json from the repo. Returns the parsed books and the file SHA (for optimistic locking). */
export async function fetchBooks(token: string): Promise<FetchBooksResult> {
  const url = `${apiUrl(FILE_PATH)}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { content: string; sha: string };
  const decoded = atob(data.content.replace(/\n/g, ""));
  const books = JSON.parse(decoded) as Book[];
  return { books, sha: data.sha };
}

/** Commit an updated books.json to the repo. Uses SHA for optimistic locking (409 on conflict). */
export async function commitBooks(
  token: string,
  books: Book[],
  sha: string,
  message: string,
): Promise<void> {
  const content = btoa(JSON.stringify(books, null, 2) + "\n");
  const res = await fetch(apiUrl(FILE_PATH), {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ message, content, sha, branch: BRANCH }),
  });
  if (!res.ok) {
    throw new Error(`GitHub commit failed ${res.status}: ${await res.text()}`);
  }
}
