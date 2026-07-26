// Kindergarten management (Step 1) — separate Dexie DB so the school
// plugin ships as a drop-in feature without polluting the main Noble
// schema. Names/hierarchy modeled after Stella Maris International School.
import Dexie, { type Table } from "dexie";

export type SchoolRole =
  | "hos"
  | "principal"
  | "teacher_homeroom"
  | "teacher_shadow"
  | "teacher_subject"
  | "parent";

export type Division = "kindergarten" | "primary" | "secondary" | "ib";
export type KgLevel = "toddler" | "nursery" | "k1" | "k2";

export interface SchoolStaff {
  id?: number;
  fullName: string;
  role: SchoolRole;
  email?: string;
  phone?: string;
  division: Division;
  classId?: number;
  createdAt: number;
}

export interface SchoolClass {
  id?: number;
  name: string;              // e.g. "K1 - Sunflower"
  division: Division;
  level?: KgLevel;
  homeroomTeacherId?: number;
  createdAt: number;
}

export type StudentStatus = "active" | "inactive" | "graduated" | "transferred";

export interface SchoolStudent {
  id?: number;
  studentNumber?: string;       // e.g. "26.27.K1.014"
  fullName: string;
  nickname?: string;
  dob?: number;
  pob?: string;                 // place of birth
  address?: string;
  religion?: string;
  joinedAt?: number;            // date student joined school
  classId?: number;
  gender?: "M" | "F";
  allergies?: string;
  notes?: string;
  photoDataUrl?: string;
  certificates?: string[];      // certificates / achievements
  extracurriculars?: string[];  // extracurricular activities
  status?: StudentStatus;
  createdAt: number;
}

export interface SchoolGuardian {
  id?: number;
  studentId: number;
  relation: "father" | "mother" | "guardian";
  fullName: string;
  email?: string;
  whatsapp?: string;
  isPrimary?: boolean;
}

export type AttendanceStatus = "present" | "absent" | "sick" | "permission" | "late";

export interface AttendanceRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: number;   // day timestamp (midnight)
  status: AttendanceStatus;
  note?: string;
  teacherId?: number;
  createdAt: number;
}

export interface DailyActivityLog {
  id?: number;
  classId: number;
  date: number;
  title: string;
  body: string;                 // narrative, EN/ID mixed OK
  photoIds?: number[];          // ids into main Noble photos table (reuse camera plugin)
  teacherId?: number;
  createdAt: number;
}

export interface LessonPlan {
  id?: number;
  classId: number;
  weekStart: number;
  subject?: string;
  objective: string;
  activities: string;
  materials?: string;
  assessment?: string;
  teacherId?: number;
  createdAt: number;
}

export interface TimetableSlot {
  id?: number;
  classId: number;
  dayOfWeek: number;           // 0=Sun..6=Sat
  startTime: string;           // "08:00"
  endTime: string;             // "08:45"
  subject: string;
  teacherId?: number;
}

export interface ProjectPlan {
  id?: number;
  classId: number;
  title: string;
  summary: string;
  startAt?: number;
  endAt?: number;
  milestones: { label: string; dueAt?: number; done: boolean }[];
  teacherId?: number;
  createdAt: number;
}

export interface Announcement {
  id?: number;
  scope: "all" | "division" | "class";
  division?: Division;
  classId?: number;
  title: string;
  body: string;
  authorId?: number;
  createdAt: number;
}

export interface SchoolMessage {
  id?: number;
  fromRole: SchoolRole;
  fromId?: number;
  toStudentId?: number;         // for teacher↔parent, thread per student
  toClassId?: number;           // for teacher↔class broadcast
  body: string;
  read?: boolean;
  createdAt: number;
}

export type AssessmentPeriod = "weekly" | "monthly" | "semester";

export interface Assessment {
  id?: number;
  studentId: number;
  classId: number;
  period: AssessmentPeriod;
  periodStart: number;         // start of week/month/semester
  domains: { name: string; score: number; comment?: string }[]; // e.g. Language, Motor, Social
  overallComment?: string;
  teacherId?: number;
  createdAt: number;
}

export interface SchoolCalendarEvent {
  id?: number;
  scope: "all" | "division" | "class";
  division?: Division;
  classId?: number;
  title: string;
  eventAt: number;
  endAt?: number;
  notes?: string;
  createdAt: number;
}

class SchoolDB extends Dexie {
  staff!: Table<SchoolStaff, number>;
  classes!: Table<SchoolClass, number>;
  students!: Table<SchoolStudent, number>;
  guardians!: Table<SchoolGuardian, number>;
  attendance!: Table<AttendanceRecord, number>;
  activities!: Table<DailyActivityLog, number>;
  lessons!: Table<LessonPlan, number>;
  timetable!: Table<TimetableSlot, number>;
  projects!: Table<ProjectPlan, number>;
  announcements!: Table<Announcement, number>;
  messages!: Table<SchoolMessage, number>;
  assessments!: Table<Assessment, number>;
  calendar!: Table<SchoolCalendarEvent, number>;

  constructor() {
    super("noble_school");
    this.version(1).stores({
      staff: "++id, role, division, classId",
      classes: "++id, division, level",
      students: "++id, classId, fullName",
      guardians: "++id, studentId, email",
      attendance: "++id, classId, studentId, date",
      activities: "++id, classId, date",
      lessons: "++id, classId, weekStart",
      timetable: "++id, classId, dayOfWeek",
      projects: "++id, classId, startAt",
      announcements: "++id, scope, classId, createdAt",
      messages: "++id, toStudentId, toClassId, createdAt",
      assessments: "++id, studentId, classId, period, periodStart",
      calendar: "++id, scope, classId, eventAt",
    });
    // v2 — richer student profile; migrate legacy nickname-as-studentId rows.
    this.version(2)
      .stores({
        students: "++id, classId, fullName, studentNumber, status",
      })
      .upgrade(async (tx) => {
        await tx.table("students").toCollection().modify((s: SchoolStudent) => {
          if (!s.studentNumber && s.nickname && /^\d{2}\.\d{2}\.[A-Z0-9]+\.\d+/i.test(s.nickname)) {
            s.studentNumber = s.nickname;
            s.nickname = undefined;
          }
          if (!s.status) s.status = "active";
        });
      });
  }
}

let _db: SchoolDB | null = null;
export function getSchoolDb(): SchoolDB {
  if (typeof window === "undefined") return null as unknown as SchoolDB;
  if (!_db) _db = new SchoolDB();
  return _db;
}

export const ROLE_LABEL: Record<SchoolRole, string> = {
  hos: "Head of School",
  principal: "Principal",
  teacher_homeroom: "Homeroom Teacher",
  teacher_shadow: "Shadow Teacher",
  teacher_subject: "Subject Teacher",
  parent: "Parent / Guardian",
};

export const DIVISION_LABEL: Record<Division, string> = {
  kindergarten: "Kindergarten",
  primary: "Primary (1–6)",
  secondary: "Secondary / Junior High (7–10)",
  ib: "IB Diploma (11–12)",
};

export const KG_LEVELS: KgLevel[] = ["toddler", "nursery", "k1", "k2"];

export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function startOfWeek(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - dow);
  return d.getTime();
}
