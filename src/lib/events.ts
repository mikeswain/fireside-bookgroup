"use server";

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { BookEvent } from "./types";

const EVENTS_PATH = join(process.cwd(), "data", "events.json");
const MEMBERS_PATH = join(process.cwd(), "data", "members.json");

export async function getEvents(): Promise<BookEvent[]> {
  const raw = await readFile(EVENTS_PATH, "utf-8");
  return JSON.parse(raw) as BookEvent[];
}

export async function getMembers(): Promise<string[]> {
  const raw = await readFile(MEMBERS_PATH, "utf-8");
  return JSON.parse(raw) as string[];
}

export async function addEvent(event: BookEvent): Promise<void> {
  const events = await getEvents();
  events.push(event);
  await writeFile(EVENTS_PATH, JSON.stringify(events, null, 2) + "\n");
}
