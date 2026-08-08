import { createFileRoute } from "@tanstack/react-router";
import { createNobleSupabase, normalizeContact } from "@/lib/supabase.server";
import { sendSerialEmail } from "@/lib/store-admin.server";
import { PLANS } from "@/lib/store.functions";
import { PLUGIN_REGISTRY } from "@/lib/plugins";

/**
 * GET /api/komerce-check-status?invoiceNo=xxx
 * Polled from the order/receipt page every few seconds while waiting for
 * payment. Adapted from pulsaapps' proven pattern.
 *
 * Also acts as a SAFETY NET: if the webhook never fires for some reason
 * (e.g. Komerce couldn't reach it, or a field-name mismatch meant the
 * callback was never registered on their side — a real bug we hit and
 * fixed once already), this route independently confirms PAID directly
 * from Komerce and does the same mark-paid + issue-voucher + send-email
 * work the webhook does, so the order doesn't stay stuck forever as long
 * as the buyer's tab is open and polling.
 */

const KOMERCE_SANDBOX_URL = "https://api-sandbox.collaborator.komerce.id";
const KOMERCE_PRODUCTION_URL = "https://api.collaborator.komerce.id";

async function getKomerceBaseUrl(supabase: ReturnType<typeof createNobleSupabase>): Promise<string> {
  if (!supabase) return KOMERCE_SANDBOX_URL;
  const { data } = await supabase.from("site_features").select("enabled").eq("key", "komerce_production_mode").maybeSingle();
  return data?.enabled ? KOMERCE_PRODUCTION_URL : KOMERCE_SANDBOX_URL;
}

export const Route = createFileRoute("/api/komerce-check-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const invoiceNo = url.searchParams.get("invoiceNo");
          if (!invoiceNo) return json({ error: "Parameter invoiceNo wajib diisi" }, 400);
          if (!process.env.KOMERCE_API_KEY) return json({ error: "Server belum dikonfigurasi" }, 500);

          const supabase = createNobleSupabase();
          if (!supabase) return json({ error: "Server belum dikonfigurasi" }, 500);

          const orderSerial = invoiceNo.replace(/^INV-/, "");
          const { data: order, error } = await supabase.from("store_orders").select("*").eq("serial", orderSerial).maybeSingle();
          if (error || !order) return json({ error: "Order tidak ditemukan" }, 404);
          // Already confirmed (by the webhook, or an earlier poll) — no need to hit Komerce again.
          if (order.status === "paid" || order.status === "delivered") return json({ data: { status: "PAID" } }, 200);
          if (!order.komerce_merchant_ref) return json({ data: { status: "PENDING" } }, 200);

          const komerceBaseUrl = await getKomerceBaseUrl(supabase);
          const res = await fetch(`${komerceBaseUrl}/user/api/v1/user/payment/status/${order.komerce_merchant_ref}`, {
            headers: { "x-api-key": process.env.KOMERCE_API_KEY },
          });
          const data = await res.json();
          if (!res.ok) return json({ error: data?.meta?.message ?? "Gagal cek status" }, 502);

          const status = String(data?.data?.status || "").toUpperCase();
          if (status === "PAID") {
            const invoiceNoFinal = order.invoice_no ?? `INV-${order.serial}`;
            const { error: updateError } = await supabase
              .from("store_orders")
              .update({ status: "paid", paid_at: new Date().toISOString(), invoice_no: invoiceNoFinal, komerce_raw_response: data, komerce_status: status })
              .eq("id", order.id);
            if (!updateError) {
              const contact = normalizeContact(order.buyer_email || order.buyer_whatsapp);
              const isPlugin = order.product_type === "plugin";
              const { error: voucherError } = await supabase.from("noble_vouchers").upsert(
                {
                  code: order.serial,
                  bound_contact: contact,
                  tier: isPlugin ? null : order.tier,
                  duration_days: isPlugin ? null : order.duration_days,
                  plugin_id: isPlugin ? order.plan_id : null,
                  status: "unused",
                  note: `Store order ${order.id} (${order.plan_id}) — paid via Komerce (confirmed via status poll)`,
                },
                { onConflict: "code" },
              );
              if (!voucherError && order.buyer_email) {
                const planLabel = isPlugin
                  ? (PLUGIN_REGISTRY.find((p) => p.id === order.plan_id)?.nameId ?? order.plan_id)
                  : (PLANS.find((p) => p.id === order.plan_id)?.nameId ?? order.plan_id);
                await sendSerialEmail(order.buyer_email, order.buyer_name, planLabel, order.serial);
              }
            }
          }
          return json(data, 200);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : String(e) }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
