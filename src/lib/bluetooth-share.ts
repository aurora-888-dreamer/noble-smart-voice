// Bluetooth / Nearby share for Noble items.
//
// Web browsers cannot open raw Bluetooth sockets to arbitrary phones, but
// `navigator.share()` on Android exposes Bluetooth, Nearby Share and Quick
// Share in the system share sheet. We package the selected items as a typed
// `.noble` JSON file so the receiver — after opening it in Noble — auto-
// imports them into the same menu.

import type { ItemType } from "./db";

export type PacketType = ItemType | "trip" | "project" | "reminder";

export interface NoblePacket {
  __noble: true;
  version: 1;
  type: PacketType;
  createdAt: number;
  items: unknown[];
}

export function buildPacket(type: PacketType, items: unknown[]): NoblePacket {
  return { __noble: true, version: 1, type, createdAt: Date.now(), items };
}

function packetToFile(packet: NoblePacket): File {
  const blob = new Blob([JSON.stringify(packet, null, 2)], {
    type: "application/json",
  });
  const stamp = new Date(packet.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const name = `noble-${packet.type}-${stamp}.noble.json`;
  return new File([blob], name, { type: "application/json" });
}

/** True if the browser can hand a file off to the OS share sheet (Bluetooth, Nearby, etc.). */
export function canShareBluetooth(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share !== "function") return false;
  try {
    const probe = new File([""], "probe.json", { type: "application/json" });
    return !!nav.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Send items via the OS share sheet — user picks Bluetooth, Nearby Share,
 * Quick Share, or another target. On desktop / unsupported browsers we fall
 * back to downloading the packet file so the user can transfer it manually.
 */
export async function sendViaBluetooth(
  type: PacketType,
  items: unknown[],
  opts?: { title?: string },
): Promise<{ ok: boolean; fallback?: "download" | "unsupported"; error?: string }> {
  const packet = buildPacket(type, items);
  const file = packetToFile(packet);
  const title = opts?.title ?? `Noble — ${items.length} ${type}${items.length > 1 ? "s" : ""}`;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title,
        text: "Noble transfer — open this file in Noble to import.",
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // AbortError = user dismissed picker; not a hard failure
      if (/abort/i.test(msg)) return { ok: false, error: "cancelled" };
      // Fall through to download fallback
    }
  }

  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, fallback: "download" };
  } catch (err) {
    return { ok: false, fallback: "unsupported", error: String(err) };
  }
}

/** Web Bluetooth pairing scan — informational only. Used by Settings > Bluetooth. */
export interface BTDeviceInfo {
  id: string;
  name: string;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export async function scanBluetoothDevice(): Promise<BTDeviceInfo | null> {
  const nav = navigator as Navigator & {
    bluetooth?: {
      requestDevice: (opts: unknown) => Promise<{ id: string; name?: string }>;
    };
  };
  if (!nav.bluetooth) return null;
  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [],
    });
    return { id: device.id, name: device.name ?? "Unknown device" };
  } catch {
    return null;
  }
}

const PAIRED_KEY = "noble.bt.paired";

export function getPairedDevices(): BTDeviceInfo[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PAIRED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addPairedDevice(d: BTDeviceInfo) {
  const list = getPairedDevices().filter((x) => x.id !== d.id);
  list.unshift(d);
  localStorage.setItem(PAIRED_KEY, JSON.stringify(list.slice(0, 10)));
}

export function removePairedDevice(id: string) {
  const list = getPairedDevices().filter((x) => x.id !== id);
  localStorage.setItem(PAIRED_KEY, JSON.stringify(list));
}

/** Import a packet on the receiving side. Returns the destination route. */
export async function importPacket(
  packet: unknown,
): Promise<{ ok: boolean; type?: PacketType; count?: number; route?: string; error?: string }> {
  if (!packet || typeof packet !== "object") return { ok: false, error: "Invalid packet" };
  const p = packet as Partial<NoblePacket>;
  if (p.__noble !== true || !p.type || !Array.isArray(p.items)) {
    return { ok: false, error: "Not a Noble packet" };
  }
  const { getDb } = await import("./db");
  const db = getDb();
  const type = p.type;
  const items = p.items.map((it) => {
    if (it && typeof it === "object") {
      const copy: Record<string, unknown> = { ...(it as Record<string, unknown>) };
      delete copy.id;
      return copy;
    }
    return it;
  });
  const now = Date.now();
  const withStamp = <T extends Record<string, unknown>>(rows: T[]) =>
    rows.map((r) => ({ createdAt: now, ...r }));

  const routes: Record<PacketType, string> = {
    note: "/notes",
    task: "/tasks",
    meeting: "/meetings",
    appointment: "/appointments",
    contact: "/contacts",
    message: "/notes",
    trip: "/trips",
    project: "/projects",
    reminder: "/reminders",
  };

  const rows = withStamp(items as Record<string, unknown>[]);

  try {
    if (type === "note") await db.notes.bulkAdd(rows as never);
    else if (type === "task") await db.tasks.bulkAdd(rows as never);
    else if (type === "meeting") await db.meetings.bulkAdd(rows as never);
    else if (type === "appointment") await db.appointments.bulkAdd(rows as never);
    else if (type === "contact") await db.contacts.bulkAdd(rows as never);
    else if (type === "message") await db.messages.bulkAdd(rows as never);
    else if (type === "trip") await db.trips.bulkAdd(rows as never);
    else if (type === "project") await db.projects.bulkAdd(rows as never);
    else if (type === "reminder") await db.reminders.bulkAdd(rows as never);
    else return { ok: false, error: `Unknown type: ${type}` };
    return { ok: true, type, count: items.length, route: routes[type] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

