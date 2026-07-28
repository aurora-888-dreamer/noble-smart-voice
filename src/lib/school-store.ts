// Session/identity for the School plugin.
//
// One login screen for everyone: UserID + PIN. The server resolves who you
// are (staff or parent) and which role you hold — nobody picks a name or a
// role by hand. The session is persisted in localStorage so stepping out to
// the NSV home screen and coming back never asks for the PIN again.
import { useEffect, useState } from "react";
import { loginWithUserId, changeMyPin, resetPinByEmail } from "./school-accounts.functions";
import { routeForRole, type SchoolRole, type StaffTier } from "./school-roles";

export type { StaffTier };
export type StaffRole = SchoolRole;
export { routeForRole };

const SESSION_KEY = "noble.school.session";
const PW_KEY = "noble.school.pw";

export interface SchoolSession {
  kind: "staff" | "parent";
  userId: string;
  id: string;
  name: string;
  role: StaffRole | null;
  division: string | null;
  classId: string | null;
  parentCode: string | null;
  pinIsDefault: boolean;
}

/** Legacy alias kept so dashboard components keep their prop shape. */
export type TeacherDevice = {
  id: string;
  name: string;
  classId: string | null;
  role?: StaffRole;
  division?: string | null;
  userId?: string;
};

function emit() {
  window.dispatchEvent(new Event("noble:school"));
}

export function getSchoolSession(): SchoolSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SchoolSession;
  } catch {
    return null;
  }
}

export function getStoredSchoolPassword(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PW_KEY) || "";
}

export function getSchoolTier(): StaffTier | null {
  const s = getSchoolSession();
  if (!s || s.kind !== "staff") return null;
  return s.role && ["hos", "vice_hos", "admin_hos", "principal", "vice_principal", "admin_principal"].includes(s.role) ? "admin" : "teacher";
}

/** UserID + PIN — the only way into the School Dashboard. */
export async function schoolLogin(userId: string, pin: string) {
  const res = await loginWithUserId({ data: { userId, pin } });
  if (!res.ok) return res;
  if (res.kind === "staff") {
    const session: SchoolSession = {
      kind: "staff",
      userId: res.staff.user_id,
      id: res.staff.id,
      name: res.staff.full_name,
      role: res.staff.role as StaffRole,
      division: res.staff.division,
      classId: res.staff.class_id,
      parentCode: null,
      pinIsDefault: res.pinIsDefault,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(PW_KEY, res.tierPassword);
  } else {
    const session: SchoolSession = {
      kind: "parent",
      userId: res.guardian.user_id,
      id: res.guardian.id,
      name: res.guardian.full_name,
      role: null,
      division: null,
      classId: null,
      parentCode: res.guardian.invite_code,
      pinIsDefault: res.pinIsDefault,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  emit();
  return res;
}

export async function changeSchoolPin(currentPin: string, newPin: string) {
  const s = getSchoolSession();
  if (!s) return { ok: false as const, error: "Sesi tidak aktif." };
  const res = await changeMyPin({ data: { userId: s.userId, currentPin, newPin } });
  if (res.ok) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, pinIsDefault: false }));
    emit();
  }
  return res;
}

export async function forgotSchoolPin(userId: string, email: string) {
  return resetPinByEmail({ data: { userId, email } });
}

export function schoolLogout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PW_KEY);
  emit();
}

export function useSchoolSession() {
  const [session, setSession] = useState<SchoolSession | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setSession(getSchoolSession());
      setReady(true);
    };
    sync();
    window.addEventListener("noble:school", sync);
    return () => window.removeEventListener("noble:school", sync);
  }, []);
  return {
    session,
    ready,
    role: (session?.kind === "staff" ? session.role : null) as StaffRole | null,
    division: session?.division ?? null,
    staffName: session?.name ?? null,
  };
}

/** Parent's invite code, resolved from the logged-in parent session. */
export function getParentCode(): string | null {
  const s = getSchoolSession();
  return s && s.kind === "parent" ? s.parentCode : null;
}
export function parentLogout() {
  schoolLogout();
}
export function useParentCode() {
  const { session } = useSchoolSession();
  return session && session.kind === "parent" ? session.parentCode : null;
}
