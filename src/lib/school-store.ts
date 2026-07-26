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
import { checkSchoolAccess, redeemGuardianInvite, type StaffTier } from "./school.functions";

const TIER_KEY = "noble.school.tier";           // "admin" | "teacher"
const SUBROLE_KEY = "noble.school.subrole";      // "hos" | "admin_hos" | "principal" | "teacher"
const DIVISION_KEY = "noble.school.division";    // Principal's assigned division
const STAFF_NAME_KEY = "noble.school.staffName"; // picked identity for attribution (teacher tier)
const PARENT_CODE_KEY = "noble.school.parentCode";

export type AdminSubrole = "hos" | "admin_hos" | "principal";

// ————— Staff session —————
export async function loginSchoolStaff(password: string): Promise<{ ok: boolean; tier?: StaffTier }> {
  const res = await checkSchoolAccess({ data: { password } });
  if (!res.ok) return { ok: false };
  sessionStorage.setItem(TIER_KEY, res.tier);
  window.dispatchEvent(new Event("noble:school"));
  return { ok: true, tier: res.tier };
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

export function schoolLogout() {
  sessionStorage.removeItem(TIER_KEY);
  sessionStorage.removeItem(SUBROLE_KEY);
  sessionStorage.removeItem(DIVISION_KEY);
  sessionStorage.removeItem(STAFF_NAME_KEY);
  window.dispatchEvent(new Event("noble:school"));
}

export function useSchoolSession() {
  const [tier, setTier] = useState<StaffTier | null>(null);
  const [subrole, setSubrole] = useState<AdminSubrole | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => {
      setTier(getSchoolTier());
      setSubrole(getAdminSubrole());
      setDivision(getPrincipalDivision());
      setStaffName(getStaffIdentity());
    };
    sync();
    window.addEventListener("noble:school", sync);
    return () => window.removeEventListener("noble:school", sync);
  }, []);
  return { tier, subrole, division, staffName };
}

// ————— Parent session (a verified invite code — NOT a free student pick) —————
export async function redeemParentCode(code: string) {
  const res = await redeemGuardianInvite({ data: { code } });
  if (res.ok) {
    sessionStorage.setItem(PARENT_CODE_KEY, code.trim().toUpperCase());
    window.dispatchEvent(new Event("noble:school"));
  }
  return res;
}
export function getParentCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PARENT_CODE_KEY);
}
export function parentLogout() {
  sessionStorage.removeItem(PARENT_CODE_KEY);
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
