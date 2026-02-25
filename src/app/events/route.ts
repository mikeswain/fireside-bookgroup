export const runtime = "edge";

import { fetchJsonFile } from "@/lib/github";
import type { Book } from "@/lib/types";
import { generateIcsCalendar } from "ts-ics";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return token;
}

export async function GET() {
  const now = new Date().getTime();
  const { data: books } = await fetchJsonFile<Book[]>(getToken(), "data/books.json");
  const ics = generateIcsCalendar({
    version: "2.0",
    prodId: "-//Puhoi Fireside Bookgroup//EN",
    events: books
      .filter((book): book is (Omit<Book, 'meetingDate'> & { meetingDate: string; }) => typeof book.meetingDate === "string")
      .map(book => [new Date(book.meetingDate), book] as const)
      .filter(([date, _]: readonly [Date, Book]) => date.getTime() > now)
      .map(([date, book]) => ({
        uid: book.id,
        title: "Fireside Bookgroup",
        stamp: { date },
        start: { date },
        end: { date: new Date(date.getTime() + 3 * 60 * 60 * 1000) },
        summary: `Bookgroup: ${book.title} by ${book.author}, proposer ${book.proposer}`,
      })),
  });
  return new Response(ics, {
    status: 200,
    headers: { "Content-Type": "application/ics" },
  });
}
