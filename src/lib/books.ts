import { readFileSync } from "fs";
import { join } from "path";
import type { Book } from "./types";

const BOOKS_PATH = join(process.cwd(), "data", "books.json");

export function getBooks(): Book[] {
  const raw = readFileSync(BOOKS_PATH, "utf-8");
  return JSON.parse(raw) as Book[];
}
