import { getDb, type Note, type Message, type Task, type Meeting, type Appointment, type Contact, type Trip, type Project, type DiaryEntry } from "../db";

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
}

// Content fingerprint (ignores id, which differs per device by design).
const fp = {
  notes: (n: Note) => `${n.title}::${n.transcript}::${n.createdAt}`,
  messages: (m: Message) => `${m.content}::${m.createdAt}`,
  tasks: (t: Task) => `${t.title}::${t.dueAt ?? ""}::${t.createdAt}`,
  meetings: (m: Meeting) => `${m.title}::${m.meetingAt ?? ""}::${m.createdAt}`,
  appointments: (a: Appointment) => `${a.title}::${a.appointmentAt}`,
  contacts: (c: Contact) => `${c.fullName.toLowerCase()}::${(c.email ?? "").toLowerCase()}`,
  trips: (t: Trip) => `${t.title}::${t.destination}::${t.createdAt}`,
  projects: (p: Project) => `${p.name}::${p.createdAt}`,
  diaries: (d: DiaryEntry) => `${d.title}::${d.entry}::${d.createdAt}`,
};

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
  };
}

// Only add items the other device has that we don't — never overwrite,
// never delete. Cross-reference fields are stripped since they'd otherwise
// point at the wrong row once re-inserted with a new local id.
export async function mergeRemoteExport(remote: SyncExport): Promise<MergeStats> {
  const db = getDb();
  const stats: MergeStats = {
    notes: 0, messages: 0, tasks: 0, meetings: 0,
    appointments: 0, contacts: 0, trips: 0, projects: 0, diaries: 0,
  };

  const existingNotes = new Set((await db.notes.toArray()).map(fp.notes));
  for (const n of remote.notes ?? []) {
    if (existingNotes.has(fp.notes(n))) continue;
    const { id: _id, ...rest } = n;
    await db.notes.add(rest);
    stats.notes++;
  }

  const existingMessages = new Set((await db.messages.toArray()).map(fp.messages));
  for (const m of remote.messages ?? []) {
    if (existingMessages.has(fp.messages(m))) continue;
    const { id: _id, relatedContactId: _rc, ...rest } = m;
    await db.messages.add(rest);
    stats.messages++;
  }

  const existingTasks = new Set((await db.tasks.toArray()).map(fp.tasks));
  for (const t of remote.tasks ?? []) {
    if (existingTasks.has(fp.tasks(t))) continue;
    const { id: _id, relatedMeetingId: _rm, relatedContactId: _rc, ...rest } = t;
    await db.tasks.add(rest);
    stats.tasks++;
  }

  const existingMeetings = new Set((await db.meetings.toArray()).map(fp.meetings));
  for (const m of remote.meetings ?? []) {
    if (existingMeetings.has(fp.meetings(m))) continue;
    const { id: _id, ...rest } = m;
    await db.meetings.add(rest);
    stats.meetings++;
  }

  const existingAppointments = new Set((await db.appointments.toArray()).map(fp.appointments));
  for (const a of remote.appointments ?? []) {
    if (existingAppointments.has(fp.appointments(a))) continue;
    const { id: _id, contactId: _cid, ...rest } = a;
    await db.appointments.add(rest);
    stats.appointments++;
  }

  const existingContacts = new Set((await db.contacts.toArray()).map(fp.contacts));
  for (const c of remote.contacts ?? []) {
    if (existingContacts.has(fp.contacts(c))) continue;
    const { id: _id, ...rest } = c;
    await db.contacts.add(rest);
    stats.contacts++;
  }

  const existingTrips = new Set((await db.trips.toArray()).map(fp.trips));
  for (const t of remote.trips ?? []) {
    if (existingTrips.has(fp.trips(t))) continue;
    const { id: _id, ...rest } = t;
    await db.trips.add(rest);
    stats.trips++;
  }

  const existingProjects = new Set((await db.projects.toArray()).map(fp.projects));
  for (const p of remote.projects ?? []) {
    if (existingProjects.has(fp.projects(p))) continue;
    const { id: _id, ...rest } = p;
    await db.projects.add(rest);
    stats.projects++;
  }

  const existingDiaries = new Set((await db.diaries.toArray()).map(fp.diaries));
  for (const d of remote.diaries ?? []) {
    if (existingDiaries.has(fp.diaries(d))) continue;
    const { id: _id, ...rest } = d;
    await db.diaries.add(rest);
    stats.diaries++;
  }

  return stats;
}
