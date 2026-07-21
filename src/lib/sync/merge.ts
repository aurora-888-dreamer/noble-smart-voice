import { getDb, type Note, type Message, type Task, type Meeting, type Appointment, type Contact, type Trip, type Project, type DiaryEntry, type Photo } from "../db";
import type { Table } from "dexie";

export interface SyncExport {
  exportedAt: string;
  notes: Note[];
  messages: Message[];
  tasks: Task[];
  meetings: Meeting[];
  appointments: Appointment[];
  contacts: Contact[];
  trips: Trip[];
  projects: Project[];
  diaries: DiaryEntry[];
  photos: Photo[];
}

export interface MergeStats {
  notes: number;
  messages: number;
  tasks: number;
  meetings: number;
  appointments: number;
  contacts: number;
  trips: number;
  projects: number;
  diaries: number;
  photos: number;
}

export async function buildLocalExport(): Promise<SyncExport> {
  const db = getDb();
  return {
    exportedAt: new Date().toISOString(),
    notes: await db.notes.toArray(),
    messages: await db.messages.toArray(),
    tasks: await db.tasks.toArray(),
    meetings: await db.meetings.toArray(),
    appointments: await db.appointments.toArray(),
    contacts: await db.contacts.toArray(),
    trips: await db.trips.toArray(),
    projects: await db.projects.toArray(),
    diaries: await db.diaries.toArray(),
    photos: await db.photos.toArray(),
  };
}

interface Syncable {
  id?: number;
  uuid?: string;
  updatedAt?: number;
  createdAt?: number;
}

// Matches by stable uuid (not guessed content) and applies last-writer-wins
// via updatedAt:
// - No local row with that uuid  -> add it as new.
// - Local row exists, remote is newer -> update the local row in place.
// - Local row exists, remote is not newer -> leave local alone.
// Never deletes anything either device already has.
async function mergeTable<T extends Syncable>(table: Table<T, number>, remoteRows: T[] | undefined): Promise<number> {
  if (!remoteRows?.length) return 0;
  let changed = 0;
  const existing = await table.toArray();
  const byUuid = new Map(existing.filter((r) => r.uuid).map((r) => [r.uuid as string, r]));

  for (const remote of remoteRows) {
    const { id: _id, ...rest } = remote;
    const local = remote.uuid ? byUuid.get(remote.uuid) : undefined;

    if (!local) {
      await table.add(rest as T);
      changed++;
    } else if (local.id != null && (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
      await table.update(local.id, rest as Partial<T> as never);
      changed++;
    }
  }
  return changed;
}

// Cross-reference fields (relatedContactId, relatedMeetingId, contactId)
// are stripped before merging — the id on the other side of that reference
// is device-local and would point at the wrong row here.
function stripRefs<T extends object>(row: T, keys: (keyof T)[]): T {
  const copy = { ...row };
  for (const k of keys) delete copy[k];
  return copy;
}

export async function mergeRemoteExport(remote: SyncExport): Promise<MergeStats> {
  const db = getDb();

  return {
    notes: await mergeTable(db.notes, remote.notes),
    messages: await mergeTable(db.messages, remote.messages?.map((m) => stripRefs(m, ["relatedContactId"]))),
    tasks: await mergeTable(db.tasks, remote.tasks?.map((t) => stripRefs(t, ["relatedMeetingId", "relatedContactId"]))),
    meetings: await mergeTable(db.meetings, remote.meetings),
    appointments: await mergeTable(db.appointments, remote.appointments?.map((a) => stripRefs(a, ["contactId"]))),
    contacts: await mergeTable(db.contacts, remote.contacts),
    trips: await mergeTable(db.trips, remote.trips),
    projects: await mergeTable(db.projects, remote.projects),
    diaries: await mergeTable(db.diaries, remote.diaries),
    photos: await mergeTable(db.photos, remote.photos),
  };
}
