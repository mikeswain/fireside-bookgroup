import { readFileSync } from "fs";
import { join } from "path";
import type { Book, Member } from "./types";
import { buildNameAbbreviations, abbreviateProposer } from "./types";

const DATA_DIR = join(process.cwd(), "data");

/** Read books with proposer names abbreviated for public (unauthenticated) display. */
export function getBooks(): Book[] {
  const books = JSON.parse(readFileSync(join(DATA_DIR, "books.json"), "utf-8")) as Book[];
  const members = JSON.parse(readFileSync(join(DATA_DIR, "members.json"), "utf-8")) as Member[];
  const abbrevs = buildNameAbbreviations(members);
  return books.map((b) => ({ ...b, proposer: abbreviateProposer(b.proposer, abbrevs) }));
}
