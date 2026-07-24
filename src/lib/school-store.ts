// Local role + identity selection for the School plugin. During build phase
// the admin (owner or /admin PIN unlocker) has access to every dashboard.
import { useEffect, useState } from "react";
import type { SchoolRole } from "./school-db";

const ROLE_KEY = "noble.school.role";
const ACTOR_KEY = "noble.school.actorId";   // staff id or parent's student id
const LINK_KEY = "noble.school.parentStudentIds"; // parent → children

export function getSchoolRole(): SchoolRole | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(ROLE_KEY) as SchoolRole | null) || null;
}
export function setSchoolRole(role: SchoolRole | null) {
  if (!role) localStorage.removeItem(ROLE_KEY);
  else localStorage.setItem(ROLE_KEY, role);
  window.dispatchEvent(new Event("noble:school"));
}
export function getActorId(): number | null {
  const v = localStorage.getItem(ACTOR_KEY);
  return v ? Number(v) : null;
}
export function setActorId(id: number | null) {
  if (id == null) localStorage.removeItem(ACTOR_KEY);
  else localStorage.setItem(ACTOR_KEY, String(id));
  window.dispatchEvent(new Event("noble:school"));
}
export function getParentStudentIds(): number[] {
  const v = localStorage.getItem(LINK_KEY);
  return v ? (JSON.parse(v) as number[]) : [];
}
export function setParentStudentIds(ids: number[]) {
  localStorage.setItem(LINK_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("noble:school"));
}

export function useSchoolRole(): SchoolRole | null {
  const [role, setRole] = useState<SchoolRole | null>(() => getSchoolRole());
  useEffect(() => {
    const sync = () => setRole(getSchoolRole());
    window.addEventListener("noble:school", sync);
    return () => window.removeEventListener("noble:school", sync);
  }, []);
  return role;
}
