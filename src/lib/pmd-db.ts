import Dexie, { type Table } from "dexie";

export type PmdStatus = "active" | "hold" | "issue" | "cancelled" | "finished";
export type PmdContactStatus = "active" | "inactive" | "blocked";
export type PmdTimelineKind = "approval" | "recommendation" | "task" | "note" | "message";
export type PmdTimelineState = "open" | "answered" | "closed";

export interface PmdContact {
  id?: number;
  userId: string;
  name: string;
  company?: string;
  role?: string;
  whatsapp?: string;
  email?: string;
  status: PmdContactStatus;
  createdAt: number;
  updatedAt?: number;
}

export interface PmdVendor {
  id?: number;
  projectId: number;
  company: string;
  contactName?: string;
  whatsapp?: string;
  email?: string;
  supplyType?: string;
  status: PmdContactStatus;
  createdAt: number;
}

export interface PmdFile {
  id?: number;
  projectId: number;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  note?: string;
  createdAt: number;
}

export interface PmdProperty {
  id: string;
  label: string;
  value: string;
}

export interface PmdBudgetLine {
  id: string;
  label: string;
  amount: number;
  spent: number;
}

export interface PmdProject {
  id?: number;
  name: string;
  code: string;
  location?: string;
  summary?: string;
  createdAt: number;
  startAt?: number;
  targetAt?: number;
  managerId?: string;
  managerName?: string;
  participantIds: number[];
  properties: PmdProperty[];
  budget: PmdBudgetLine[];
  status: PmdStatus;
  updatedAt?: number;
}

export interface PmdTimelineEntry {
  id?: number;
  projectId: number;
  parentId?: number; // undefined = main timeline entry, else a root/reply under it
  subject: string;
  body: string;
  author: string;
  kind: PmdTimelineKind;
  state: PmdTimelineState;
  recipients: string[]; // participant names for "message" kind
  createdAt: number;
}

class PmdDB extends Dexie {
  projects!: Table<PmdProject, number>;
  contacts!: Table<PmdContact, number>;
  vendors!: Table<PmdVendor, number>;
  files!: Table<PmdFile, number>;
  timeline!: Table<PmdTimelineEntry, number>;

  constructor() {
    super("noble_pmd");
    this.version(1).stores({
      projects: "++id, status, code, createdAt",
      contacts: "++id, name, status, createdAt",
      vendors: "++id, projectId, status",
      files: "++id, projectId, createdAt",
      timeline: "++id, projectId, parentId, createdAt",
    });
  }
}

let _pmd: PmdDB | null = null;

export function getPmdDb(): PmdDB {
  if (typeof window === "undefined") return null as unknown as PmdDB;
  if (!_pmd) _pmd = new PmdDB();
  return _pmd;
}

export const PMD_STATUSES: PmdStatus[] = ["active", "hold", "issue", "cancelled", "finished"];

export function statusTone(status: PmdStatus): string {
  switch (status) {
    case "active":
      return "bg-primary/15 text-primary border-primary/30";
    case "hold":
      return "bg-muted text-muted-foreground border-border";
    case "issue":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "cancelled":
      return "bg-muted text-muted-foreground border-border line-through";
    case "finished":
      return "bg-accent text-accent-foreground border-border";
  }
}

export async function exportProject(projectId: number) {
  const db = getPmdDb();
  const project = await db.projects.get(projectId);
  return {
    exportedAt: new Date().toISOString(),
    project,
    vendors: await db.vendors.where("projectId").equals(projectId).toArray(),
    files: await db.files.where("projectId").equals(projectId).toArray(),
    timeline: await db.timeline.where("projectId").equals(projectId).toArray(),
    contacts: await db.contacts.toArray(),
  };
}
