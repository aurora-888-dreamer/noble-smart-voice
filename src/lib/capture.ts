// Shared "commit a captured utterance to the database" logic.
// Used by the full-screen recorder (routes/record.tsx) so there is a single
// source of truth for how a parsed/reviewed entry becomes a Note, Task,
// Meeting, Appointment, Contact or Message.
import { getDb, type ItemType } from "./db";
import { createReminder } from "./reminders";
import type { Lang } from "./i18n";

export interface CaptureInput {
  type: ItemType;
  title: string;
  body?: string;
  when?: number;
  tags?: string[];
  contact?: { fullName: string; email?: string; phone?: string };
}

export async function saveCapturedEntry(input: CaptureInput, lang: Lang): Promise<number | undefined> {
  const db = getDb();
  const now = Date.now();
  const rawTitle = input.title.trim();
  const title = rawTitle || (lang === "id" ? "Tanpa judul" : "Untitled");
  const tags = input.tags ?? [];
  let id: number | undefined;
  let label = title;

  switch (input.type) {
    case "note":
      id = await db.notes.add({
        title: title.length > 80 ? title.slice(0, 77) + "…" : title,
        transcript: input.body ?? title,
        language: lang,
        tags,
        createdAt: now,
        updatedAt: now,
      });
      break;
    case "task":
      id = await db.tasks.add({
        title,
        dueAt: input.when,
        reminderAt: input.when,
        priority: "med",
        status: "open",
        createdAt: now,
      });
      break;
    case "meeting":
      id = await db.meetings.add({
        title,
        summary: input.body ?? "",
        attendees: [],
        meetingAt: input.when,
        actionItems: [],
        createdAt: now,
      });
      break;
    case "appointment":
      id = await db.appointments.add({
        title,
        appointmentAt: input.when ?? now + 3600_000,
        reminderAt: input.when,
      });
      break;
    case "contact": {
      const name = input.contact?.fullName ?? title;
      id = await db.contacts.add({
        fullName: name,
        email: input.contact?.email,
        phone: input.contact?.phone,
        tags,
        createdAt: now,
      });
      label = name;
      break;
    }
    case "message":
      id = await db.messages.add({
        content: input.body ?? title,
        status: "saved",
        createdAt: now,
      });
      break;
    case "diary":
      id = await db.diaries.add({
        title,
        entry: input.body ?? title,
        createdAt: now,
        updatedAt: now,
      });
      break;
    case "trip":
      id = await db.trips.add({
        title,
        destination: input.body ? input.body.slice(0, 60) : title,
        stops: [],
        packingList: [],
        notes: input.body,
        createdAt: now,
      });
      break;
    case "project":
      id = await db.projects.add({
        name: title,
        summary: input.body,
        milestones: [],
        createdAt: now,
      });
      break;
  }

  if (input.when && id && (input.type === "task" || input.type === "appointment" || input.type === "meeting")) {
    await createReminder(input.type, id, label, input.when);
  }

  return id;
}
