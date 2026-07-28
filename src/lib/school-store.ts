// Session/identity for the School plugin's new hierarchical flow:
//   Staff enters a password (Admin or Teacher tier) → picks their specific
//   sub-role/identity → gated dashboard.
//   Parent redeems a personal invite code (no password) → resolved to
//   exactly one student, server-side, every time.
//
// Kept intentionally simple for the test phase (shared password per tier,
// not per person) — at launch this gets replaced with real per-person NSV
// accounts without changing the shape most of the UI reads from.
import { useEffect, useState } from "react";
import { checkSchoolAccess, redeemGuardianInvite, loginTeacherByPin, setTeacherPin, type StaffTier } from "./school.functions";

const TIER_KEY = "noble.school.tier";           // "admin" | "teacher"
const PW_KEY = "noble.school.pw";                // stored together with tier, atomically, so they can never desync
const SUBROLE_KEY = "noble.school.subrole";      // "hos" | "admin_hos" | "principal" | "teacher"
const DIVISION_KEY = "noble.school.division";    // Principal's assigned division
const STAFF_NAME_KEY = "noble.school.staffName"; // picked identity for attribution (teacher tier)
const PARENT_CODE_KEY = "noble.school.parentCode";
const TEACHER_DEVICE_KEY = "noble.school.teacherDevice"; // persistent (localStorage) — which teacher this device belongs to
const TEACHER_UNLOCKED_KEY = "noble.school.teacherUnlocked"; // session-only — has the PIN been entered this session

export type AdminSubrole = "hos" | "admin_hos" | "principal";

// ————— Staff session —————
export async function loginSchoolStaff(password: string): Promise<{ ok: boolean; tier?: StaffTier }> {
  const res = await checkSchoolAccess({ data: { password } });
  if (!res.ok) return { ok: false };
  sessionStorage.setItem(TIER_KEY, res.tier);
  sessionStorage.setItem(PW_KEY, password);
  window.dispatchEvent(new Event("noble:school"));
  return { ok: true, tier: res.tier };
}

export function getStoredSchoolPassword(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(PW_KEY) || "";
}

export function getSchoolTier(): StaffTier | null {
  if (typeof window === "undefined") return null;
  return (sessionStorage.getItem(TIER_KEY) as StaffTier | null) || null;
}

export function setAdminSubrole(role: AdminSubrole, division?: string) {
  sessionStorage.setItem(SUBROLE_KEY, role);
  if (division) sessionStorage.setItem(DIVISION_KEY, division);
  else sessionStorage.removeItem(DIVISION_KEY);
  window.dispatchEvent(new Event("noble:school"));
}
export function getAdminSubrole(): AdminSubrole | null {
  if (typeof window === "undefined") return null;
  return (sessionStorage.getItem(SUBROLE_KEY) as AdminSubrole | null) || null;
}
export function getPrincipalDivision(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(DIVISION_KEY);
}

export function setStaffIdentity(name: string) {
  sessionStorage.setItem(STAFF_NAME_KEY, name);
  window.dispatchEvent(new Event("noble:school"));
}
export function getStaffIdentity(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STAFF_NAME_KEY);
}

// ————— Staff device-linking (persistent — survives closing the app) —————
// Once a staff member picks themselves from the roster and sets a PIN, this
// device remembers WHO they are (localStorage). Returning visits only need
// the PIN — not the shared password, not re-picking their name.
export type StaffRole =
  | "hos"
  | "admin_hos"
  | "principal"
  | "teacher_homeroom"
  | "teacher_shadow"
  | "teacher_subject";

export interface TeacherDevice {
  id: string;
  name: string;
  classId: string | null;
  role?: StaffRole;
  division?: string | null;
}

/** Which dashboard route a staff role belongs to. */
export function routeForRole(role: string | null | undefined): string {
  switch (role) {
    case "hos": return "/school/hos";
    case "admin_hos": return "/school/admin-hos";
    case "principal": return "/school/principal";
    case "teacher_homeroom":
    case "teacher_shadow":
    case "teacher_subject": return "/school/teacher";
    default: return "/school";
  }
}

export function getTeacherDevice(): TeacherDevice | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TEACHER_DEVICE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeacherDevice;
  } catch {
    return null;
  }
}
export function saveTeacherDevice(device: TeacherDevice, session?: { tier: StaffTier; password: string }) {
  localStorage.setItem(TEACHER_DEVICE_KEY, JSON.stringify(device));
  sessionStorage.setItem(TEACHER_UNLOCKED_KEY, "1");
  sessionStorage.setItem(TIER_KEY, session?.tier ?? "teacher");
  if (session?.password) sessionStorage.setItem(PW_KEY, session.password);
  sessionStorage.setItem(STAFF_NAME_KEY, device.name);
  if (device.division) sessionStorage.setItem(DIVISION_KEY, device.division);
  window.dispatchEvent(new Event("noble:school"));
}
// "Bukan Anda? Ganti akun" — fully forgets this device belongs to anyone.
export function clearTeacherDevice() {
  localStorage.removeItem(TEACHER_DEVICE_KEY);
  sessionStorage.removeItem(TEACHER_UNLOCKED_KEY);
  sessionStorage.removeItem(TIER_KEY);
  sessionStorage.removeItem(PW_KEY);
  sessionStorage.removeItem(STAFF_NAME_KEY);
  sessionStorage.removeItem(DIVISION_KEY);
  window.dispatchEvent(new Event("noble:school"));
}
export function isTeacherUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TEACHER_UNLOCKED_KEY) === "1";
}
export async function loginTeacherPin(staffId: string, pin: string) {
  const res = await loginTeacherByPin({ data: { staffId, pin } });
  if (res.ok) {
    saveTeacherDevice(
      {
        id: res.staff.id,
        name: res.staff.full_name,
        classId: res.staff.class_id,
        role: res.staff.role as StaffRole,
        division: res.staff.division as string | null,
      },
      { tier: res.tier, password: res.tierPassword },
    );
  }
  return res;
}
// First-time setup: staff picked their name from the roster and chose a
// PIN. Sets it server-side, then links this device so future visits skip
// straight to the PIN pad.
export async function completeTeacherSetup(password: string, staffId: string, pin: string) {
  const res = await setTeacherPin({ data: { password, staffId, pin } });
  if (res.ok) {
    saveTeacherDevice(
      {
        id: res.staff.id,
        name: res.staff.full_name,
        classId: res.staff.class_id,
        role: res.staff.role as StaffRole,
        division: (res.staff as { division?: string | null }).division ?? null,
      },
      { tier: res.tier, password: res.tierPassword },
    );
  }
  return res;
}

export function schoolLogout() {
  sessionStorage.removeItem(TIER_KEY);
  sessionStorage.removeItem(PW_KEY);
  sessionStorage.removeItem(SUBROLE_KEY);
  sessionStorage.removeItem(DIVISION_KEY);
  sessionStorage.removeItem(STAFF_NAME_KEY);
  sessionStorage.removeItem(TEACHER_UNLOCKED_KEY); // locks the PIN screen again, but keeps the device link
  window.dispatchEvent(new Event("noble:school"));
}

export function useSchoolSession() {
  const [tier, setTier] = useState<StaffTier | null>(null);
  const [subrole, setSubrole] = useState<AdminSubrole | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [teacherDevice, setTeacherDevice] = useState<TeacherDevice | null>(null);
  const [teacherUnlocked, setTeacherUnlockedState] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      const device = getTeacherDevice();
      const unlocked = isTeacherUnlocked();
      setTeacherDevice(device);
      setTeacherUnlockedState(unlocked);
      setTier(device && unlocked ? getSchoolTier() : device ? null : getSchoolTier());
      setSubrole(getAdminSubrole());
      setDivision(device?.division ?? getPrincipalDivision());
      setStaffName(device ? device.name : getStaffIdentity());
      setReady(true);
    };
    sync();
    window.addEventListener("noble:school", sync);
    return () => window.removeEventListener("noble:school", sync);
  }, []);
  const role = (teacherDevice?.role ?? null) as StaffRole | null;
  return { tier, subrole, division, staffName, teacherDevice, teacherUnlocked, role, ready };
}


// ————— Parent session (a verified invite code — NOT a free student pick) —————
export async function redeemParentCode(code: string) {
  const res = await redeemGuardianInvite({ data: { code } });
  if (res.ok) {
    localStorage.setItem(PARENT_CODE_KEY, code.trim().toUpperCase());
    window.dispatchEvent(new Event("noble:school"));
  }
  return res;
}
export function getParentCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PARENT_CODE_KEY);
}
export function parentLogout() {
  localStorage.removeItem(PARENT_CODE_KEY);
  window.dispatchEvent(new Event("noble:school"));
}
export function useParentCode() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setCode(getParentCode());
    sync();
    window.addEventListener("noble:school", sync);
    return () => window.removeEventListener("noble:school", sync);
  }, []);
  return code;
}
