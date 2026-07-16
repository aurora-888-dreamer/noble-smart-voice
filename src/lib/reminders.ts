import { getDb, type Reminder } from "./db";

const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function requestNotifPermission() {
  if (typeof Notification === "undefined") return Promise.resolve("denied" as NotificationPermission);
  if (Notification.permission === "granted" || Notification.permission === "denied")
    return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

function fire(r: Reminder) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Noble", { body: r.label, icon: "/icon-512.png" });
  }
  const db = getDb();
  if (r.id) db.reminders.update(r.id, { status: "fired" });
}

export function scheduleReminder(r: Reminder) {
  if (typeof window === "undefined" || !r.id) return;
  const delay = r.remindAt - Date.now();
  if (delay <= 0) return fire(r);
  const existing = timers.get(r.id);
  if (existing) clearTimeout(existing);
  timers.set(
    r.id,
    setTimeout(() => fire(r), Math.min(delay, 2_147_000_000)),
  );
}

export async function rehydrateReminders() {
  if (typeof window === "undefined") return;
  const db = getDb();
  const pending = await db.reminders.where("status").equals("pending").toArray();
  pending.forEach(scheduleReminder);
}

export async function createReminder(
  targetType: Reminder["targetType"],
  targetId: number,
  label: string,
  remindAt: number,
) {
  const db = getDb();
  const id = await db.reminders.add({
    targetType,
    targetId,
    label,
    remindAt,
    status: "pending",
  });
  const r = await db.reminders.get(id);
  if (r) scheduleReminder(r);
  return id;
}