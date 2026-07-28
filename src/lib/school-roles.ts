// Role vocabulary shared by client and server. Kept in a plain module (not a
// *.functions.ts) so both bundles can import it safely.
export type StaffTier = "admin" | "teacher";

export type SchoolRole =
  | "hos"
  | "vice_hos"
  | "admin_hos"
  | "principal"
  | "vice_principal"
  | "admin_principal"
  | "teacher_homeroom"
  | "teacher_subject"
  | "teacher_shadow"; // legacy only — never offered as a new choice

/** Roles that unlock the admin-tier server password. */
export const ADMIN_TIER_ROLES: string[] = [
  "hos",
  "vice_hos",
  "admin_hos",
  "principal",
  "vice_principal",
  "admin_principal",
];

export const ROLE_LABELS: Record<string, string> = {
  hos: "Head of School",
  vice_hos: "Vice HoS",
  admin_hos: "Admin HoS",
  principal: "Principal",
  vice_principal: "Vice Principal",
  admin_principal: "Admin Principal",
  teacher_homeroom: "Homeroom Teacher",
  teacher_subject: "Subject Teacher",
  teacher_shadow: "Shadow Teacher (legacy)",
};

/** Roles that can be created from "Kelola Role" / "Kelola Personil". */
export const CREATABLE_ROLES: { v: SchoolRole; label: string }[] = [
  { v: "vice_hos", label: "Vice HoS" },
  { v: "admin_hos", label: "Admin HoS" },
  { v: "principal", label: "Principal" },
  { v: "vice_principal", label: "Vice Principal" },
  { v: "admin_principal", label: "Admin Principal" },
  { v: "teacher_homeroom", label: "Homeroom Teacher" },
  { v: "teacher_subject", label: "Subject Teacher" },
];

export const TEACHER_ROLES: string[] = ["teacher_homeroom", "teacher_subject", "teacher_shadow"];

export const SCHOOL_WIDE_ROLES: string[] = ["hos", "vice_hos", "admin_hos"];

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role;
}

/** Which dashboard route a staff role belongs to. */
export function routeForRole(role: string | null | undefined): string {
  switch (role) {
    case "hos":
    case "vice_hos":
      return "/school/hos";
    case "admin_hos":
      return "/school/admin-hos";
    case "principal":
    case "vice_principal":
    case "admin_principal":
      return "/school/principal";
    case "teacher_homeroom":
    case "teacher_subject":
    case "teacher_shadow":
      return "/school/teacher";
    default:
      return "/school";
  }
}
