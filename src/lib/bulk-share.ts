import { shareToEmail, shareToWhatsApp, printItem } from "@/lib/share";

export interface SharePayload {
  title: string;
  body: string;
}

export function bulkTitle(items: SharePayload[]) {
  if (items.length === 1) return items[0].title;
  return `Noble — ${items.length} items`;
}

export function bulkBody(items: SharePayload[]) {
  return items.map((i) => `• ${i.title}\n${i.body}`).join("\n\n----\n\n");
}

export function shareManyWA(items: SharePayload[]) {
  shareToWhatsApp(`${bulkTitle(items)}\n\n${bulkBody(items)}`);
}
export function shareManyEmail(items: SharePayload[]) {
  shareToEmail(bulkTitle(items), bulkBody(items));
}
export function printMany(items: SharePayload[]) {
  printItem(bulkTitle(items), bulkBody(items));
}
