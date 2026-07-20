import Dexie, { type Table } from "dexie";

export type ItemType = "note" | "message" | "task" | "meeting" | "appointment" | "contact" | "diary" | "trip" | "project" | "event";

export interface Note {
  id?: number;
  uuid?: string;
  title: string;
  transcript: string;
  language: "en" | "id";
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id?: number;
  uuid?: string;
  content: string;
  relatedContactId?: number;
  status: "draft" | "saved" | "sent-later";
  createdAt: number;
  updatedAt?: number;
}

export interface Task {
  id?: number;
  uuid?: string;
  title: string;
  description?: string;
  dueAt?: number;
  priority: "low" | "med" | "high";
  status: "open" | "done";
  reminderAt?: number;
  relatedMeetingId?: number;
  relatedContactId?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Meeting {
  id?: number;
  uuid?: string;
  title: string;
  summary: string;
  attendees: string[];
  meetingAt?: number;
  actionItems: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface Appointment {
  id?: number;
  uuid?: string;
  title: string;
  contactId?: number;
  appointmentAt: number;
  location?: string;
  reminderAt?: number;
  notes?: string;
  updatedAt?: number;
}

export interface Contact {
  id?: number;
  uuid?: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface TripStop {
  label: string;
  when?: number;
  notes?: string;
}

export interface Trip {
  id?: number;
  uuid?: string;
  title: string;
  destination: string;
  startAt?: number;
  endAt?: number;
  stops: TripStop[];
  packingList: { text: string; done: boolean }[];
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface TimelineMilestone {
  label: string;
  dueAt?: number;
  status: "todo" | "in-progress" | "done";
}

export interface DiaryEntry {
  id?: number;
  uuid?: string;
  title: string;
  entry: string;
  mood?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectActivity {
  id: string;
  text: string;
  createdAt: number;
}

export interface EventEntry {
  id?: number;
  uuid?: string;
  title: string;
  eventAt: number;
  recurring: "none" | "yearly"; // yearly = birthday/anniversary-style, repeats every year on this date
  notes?: string;
  reminderAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Photo {
  id?: number;
  uuid?: string;
  kind?: "image" | "video"; // undefined = image, for backward compatibility with existing rows
  dataUrl: string; // base64 data URL (image/jpeg) — used for images only
  videoBlob?: Blob; // used for videos only — Blob storage is far more space-efficient than base64 for large files
  videoMimeType?: string;
  caption?: string;
  category?: ItemType; // which documentation category this photo belongs to
  createdAt: number;
  updatedAt?: number;
}

export interface Project {
  id?: number;
  uuid?: string;
  name: string;
  summary?: string;
  startAt?: number;
  endAt?: number;
  milestones: TimelineMilestone[];
  activities?: ProjectActivity[];
  createdAt: number;
  updatedAt?: number;
}

export interface Reminder {
  id?: number;
  targetType: ItemType;
  targetId: number;
  label: string;
  remindAt: number;
  status: "pending" | "fired" | "dismissed";
}

class NobleDB extends Dexie {
  notes!: Table<Note, number>;
  messages!: Table<Message, number>;
  tasks!: Table<Task, number>;
  meetings!: Table<Meeting, number>;
  appointments!: Table<Appointment, number>;
  contacts!: Table<Contact, number>;
  reminders!: Table<Reminder, number>;
  trips!: Table<Trip, number>;
  projects!: Table<Project, number>;
  diaries!: Table<DiaryEntry, number>;
  photos!: Table<Photo, number>;
  events!: Table<EventEntry, number>;

  constructor() {
    super("voicetag");
    this.version(1).stores({
      notes: "++id, createdAt, language",
      messages: "++id, createdAt, relatedContactId",
      tasks: "++id, status, dueAt, createdAt",
      meetings: "++id, meetingAt, createdAt",
      appointments: "++id, appointmentAt",
      contacts: "++id, fullName, email",
      reminders: "++id, remindAt, status, targetType",
    });
    this.version(2).stores({
      notes: "++id, createdAt, language",
      messages: "++id, createdAt, relatedContactId",
      tasks: "++id, status, dueAt, createdAt",
      meetings: "++id, meetingAt, createdAt",
      appointments: "++id, appointmentAt",
      contacts: "++id, fullName, email",
      reminders: "++id, remindAt, status, targetType",
      trips: "++id, startAt, createdAt",
      projects: "++id, startAt, createdAt",
    });
    this.version(3).stores({
      notes: "++id, createdAt, language",
      messages: "++id, createdAt, relatedContactId",
      tasks: "++id, status, dueAt, createdAt",
      meetings: "++id, meetingAt, createdAt",
      appointments: "++id, appointmentAt",
      contacts: "++id, fullName, email",
      reminders: "++id, remindAt, status, targetType",
      trips: "++id, startAt, createdAt",
      projects: "++id, startAt, createdAt",
      diaries: "++id, createdAt",
    });
    this.version(4).stores({
      notes: "++id, createdAt, language",
      messages: "++id, createdAt, relatedContactId",
      tasks: "++id, status, dueAt, createdAt",
      meetings: "++id, meetingAt, createdAt",
      appointments: "++id, appointmentAt",
      contacts: "++id, fullName, email",
      reminders: "++id, remindAt, status, targetType",
      trips: "++id, startAt, createdAt",
      projects: "++id, startAt, createdAt",
      diaries: "++id, createdAt",
      photos: "++id, createdAt",
    });
    // v5: add a stable uuid to every syncable row, so multi-device sync
    // (lib/sync/merge.ts) can tell "this is an edit to the same item" apart
    // from "this is a new item" — previously it guessed by content, which
    // silently duplicated anything edited after a sync instead of updating
    // it. Existing rows are backfilled with a uuid (and updatedAt, from
    // createdAt) during this upgrade; every future insert/update gets one
    // automatically via the hooks below, with no other file needing to
    // change.
    this.version(5)
      .stores({
        notes: "++id, uuid, createdAt, language",
        messages: "++id, uuid, createdAt, relatedContactId",
        tasks: "++id, uuid, status, dueAt, createdAt",
        meetings: "++id, uuid, meetingAt, createdAt",
        appointments: "++id, uuid, appointmentAt",
        contacts: "++id, uuid, fullName, email",
        reminders: "++id, remindAt, status, targetType",
        trips: "++id, uuid, startAt, createdAt",
        projects: "++id, uuid, startAt, createdAt",
        diaries: "++id, uuid, createdAt",
        photos: "++id, uuid, createdAt",
      })
      .upgrade(async (tx) => {
        const tables = ["notes", "messages", "tasks", "meetings", "appointments", "contacts", "trips", "projects", "diaries", "photos"];
        await Promise.all(
          tables.map((name) =>
            tx
              .table(name)
              .toCollection()
              .modify((row: { uuid?: string; updatedAt?: number; createdAt: number }) => {
                if (!row.uuid) row.uuid = crypto.randomUUID();
                if (!row.updatedAt) row.updatedAt = row.createdAt;
              }),
          ),
        );
      });

    // v6: new "events" table — lightweight dated entries (birthdays,
    // anniversaries, etc.) shown in the Reminders page and selectable from
    // Calendar's new-entry form.
    this.version(6).stores({
      notes: "++id, uuid, createdAt, language",
      messages: "++id, uuid, createdAt, relatedContactId",
      tasks: "++id, uuid, status, dueAt, createdAt",
      meetings: "++id, uuid, meetingAt, createdAt",
      appointments: "++id, uuid, appointmentAt",
      contacts: "++id, uuid, fullName, email",
      reminders: "++id, remindAt, status, targetType",
      trips: "++id, uuid, startAt, createdAt",
      projects: "++id, uuid, startAt, createdAt",
      diaries: "++id, uuid, createdAt",
      photos: "++id, uuid, createdAt",
      events: "++id, uuid, eventAt, createdAt",
    });

    this.installSyncHooks();
  }

  private installSyncHooks() {
    const syncable = [
      this.notes, this.messages, this.tasks, this.meetings, this.appointments,
      this.contacts, this.trips, this.projects, this.diaries, this.photos, this.events,
    ] as Array<Table<{ uuid?: string; updatedAt?: number }, number>>;

    for (const table of syncable) {
      table.hook("creating", (_primKey, obj) => {
        if (!obj.uuid) obj.uuid = crypto.randomUUID();
        if (!obj.updatedAt) obj.updatedAt = Date.now();
      });
      table.hook("updating", (modifications) => {
        // Don't stomp on an explicit updatedAt the caller already set.
        if ((modifications as Record<string, unknown>).updatedAt != null) return undefined;
        return { updatedAt: Date.now() };
      });
    }
  }
}

let _db: NobleDB | null = null;
// For a "yearly" event (birthday, anniversary, etc.), returns the next
// upcoming occurrence — this year's date if it hasn't passed yet, otherwise
// next year's. For a "none" (one-time) event, just returns eventAt as-is.
// Computed on the fly rather than stored, so a birthday only needs to be
// entered once and keeps reminding every year automatically.
export function nextOccurrence(eventAt: number, recurring: "none" | "yearly", relativeTo: number = Date.now()): number {
  if (recurring !== "yearly") return eventAt;
  const original = new Date(eventAt);
  const now = new Date(relativeTo);
  let candidate = new Date(now.getFullYear(), original.getMonth(), original.getDate(), original.getHours(), original.getMinutes());
  if (candidate.getTime() < relativeTo) {
    candidate = new Date(now.getFullYear() + 1, original.getMonth(), original.getDate(), original.getHours(), original.getMinutes());
  }
  return candidate.getTime();
}

export function getDb(): NobleDB {
  if (typeof window === "undefined") {
    // SSR guard — never actually queried during SSR
    return null as unknown as NobleDB;
  }
  if (!_db) _db = new NobleDB();
  return _db;
}

export async function exportAll() {
  const db = getDb();
  return {
    exportedAt: new Date().toISOString(),
    notes: await db.notes.toArray(),
    messages: await db.messages.toArray(),
    tasks: await db.tasks.toArray(),
    meetings: await db.meetings.toArray(),
    appointments: await db.appointments.toArray(),
    contacts: await db.contacts.toArray(),
    reminders: await db.reminders.toArray(),
    trips: await db.trips.toArray(),
    projects: await db.projects.toArray(),
    diaries: await db.diaries.toArray(),
    photos: await db.photos.toArray(),
    events: await db.events.toArray(),
  };
}

export async function importAll(payload: Record<string, unknown[]>) {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.notes, db.messages, db.tasks, db.meetings, db.appointments, db.contacts, db.reminders, db.trips, db.projects, db.diaries, db.photos, db.events],
    async () => {
      if (Array.isArray(payload.notes)) await db.notes.bulkPut(payload.notes as Note[]);
      if (Array.isArray(payload.messages)) await db.messages.bulkPut(payload.messages as Message[]);
      if (Array.isArray(payload.tasks)) await db.tasks.bulkPut(payload.tasks as Task[]);
      if (Array.isArray(payload.meetings)) await db.meetings.bulkPut(payload.meetings as Meeting[]);
      if (Array.isArray(payload.appointments))
        await db.appointments.bulkPut(payload.appointments as Appointment[]);
      if (Array.isArray(payload.contacts)) await db.contacts.bulkPut(payload.contacts as Contact[]);
      if (Array.isArray(payload.reminders))
        await db.reminders.bulkPut(payload.reminders as Reminder[]);
      if (Array.isArray(payload.trips)) await db.trips.bulkPut(payload.trips as Trip[]);
      if (Array.isArray(payload.projects)) await db.projects.bulkPut(payload.projects as Project[]);
      if (Array.isArray(payload.diaries)) await db.diaries.bulkPut(payload.diaries as DiaryEntry[]);
      if (Array.isArray(payload.photos)) await db.photos.bulkPut(payload.photos as Photo[]);
      if (Array.isArray(payload.events)) await db.events.bulkPut(payload.events as EventEntry[]);
    },
  );
}