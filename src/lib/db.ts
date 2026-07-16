import Dexie, { type Table } from "dexie";

export type ItemType = "note" | "message" | "task" | "meeting" | "appointment" | "contact";

export interface Note {
  id?: number;
  title: string;
  transcript: string;
  language: "en" | "id";
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id?: number;
  content: string;
  relatedContactId?: number;
  status: "draft" | "saved" | "sent-later";
  createdAt: number;
}

export interface Task {
  id?: number;
  title: string;
  description?: string;
  dueAt?: number;
  priority: "low" | "med" | "high";
  status: "open" | "done";
  reminderAt?: number;
  relatedMeetingId?: number;
  relatedContactId?: number;
  createdAt: number;
}

export interface Meeting {
  id?: number;
  title: string;
  summary: string;
  attendees: string[];
  meetingAt?: number;
  actionItems: string[];
  createdAt: number;
}

export interface Appointment {
  id?: number;
  title: string;
  contactId?: number;
  appointmentAt: number;
  location?: string;
  reminderAt?: number;
  notes?: string;
}

export interface Contact {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
}

export interface TripStop {
  label: string;
  when?: number;
  notes?: string;
}

export interface Trip {
  id?: number;
  title: string;
  destination: string;
  startAt?: number;
  endAt?: number;
  stops: TripStop[];
  packingList: { text: string; done: boolean }[];
  notes?: string;
  createdAt: number;
}

export interface TimelineMilestone {
  label: string;
  dueAt?: number;
  status: "todo" | "in-progress" | "done";
}

export interface Project {
  id?: number;
  name: string;
  summary?: string;
  startAt?: number;
  endAt?: number;
  milestones: TimelineMilestone[];
  createdAt: number;
}

export interface Reminder {
  id?: number;
  targetType: ItemType;
  targetId: number;
  label: string;
  remindAt: number;
  status: "pending" | "fired" | "dismissed";
}

class VoiceTagDB extends Dexie {
  notes!: Table<Note, number>;
  messages!: Table<Message, number>;
  tasks!: Table<Task, number>;
  meetings!: Table<Meeting, number>;
  appointments!: Table<Appointment, number>;
  contacts!: Table<Contact, number>;
  reminders!: Table<Reminder, number>;
  trips!: Table<Trip, number>;
  projects!: Table<Project, number>;

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
  }
}

let _db: VoiceTagDB | null = null;
export function getDb(): VoiceTagDB {
  if (typeof window === "undefined") {
    // SSR guard — never actually queried during SSR
    return null as unknown as VoiceTagDB;
  }
  if (!_db) _db = new VoiceTagDB();
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
  };
}

export async function importAll(payload: Record<string, unknown[]>) {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.notes, db.messages, db.tasks, db.meetings, db.appointments, db.contacts, db.reminders, db.trips, db.projects],
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
    },
  );
}