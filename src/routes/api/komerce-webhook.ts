import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { createNobleSupabase, normalizeContact } from "@/lib/supabase.server";
import { sendSerialEmail } from "@/lib/store-admin.server";
import { PLANS } from "@/lib/store.functions";

/**
 * POST /api/public/komerce-webhook
 *
 * Signature verification uses the PER-TRANSACTION callback key stored on
 * the order (set in komerce-create-transaction.ts), not a static env var —
 * pulsaapps' integration had a critical bug here early on (static key
 * meant signatures never matched, so orders stayed PENDING forever until
 * an admin approved manually). This starts correct from day one:
 *   1. Parse order_id (our invoice_no) from the raw body.
 *   2. Look up that order's own komerce_callback_key.
 *   3. HMAC-SHA256(rawBody, that key) must match the X-Callback-Api-Key header.
 * On confirmed PAID, this also issues the redeemable NSV voucher itself
 * (same upsert markOrderPaid does for the manual "Mark Paid" button), so
 * automated Komerce payments activate a serial exactly like manual ones.
 */
export const Route = createFileRoute("/api/komerce-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabase = createNobleSupabase();
        if (!supabase) { console.error("[komerce-webhook] supabase belum dikonfigurasi."); return ok(); }

        const rawBody = await request.text();
        const receivedSignature = request.headers.get("x-callback-api-key") || "";

        let body: Record<string, unknown> = {};
        try { body = JSON.parse(rawBody); } catch { console.error("[komerce-webhook] body bukan JSON valid"); return ok(); }

        const invoiceNo = String(body.order_id || "").trim();
        if (!invoiceNo) { console.error("[komerce-webhook] tidak ada order_id di body"); return ok(); }

        const { data: order, error: findError } = await supabase
          .from("store_orders").select("*").eq("invoice_no", invoiceNo).maybeSingle();
        if (findError || !order) { console.error("[komerce-webhook] order tidak ditemukan:", invoiceNo); return ok(); }
        if (!order.komerce_callback_key) { console.error("[komerce-webhook] order tanpa callback key:", invoiceNo); return ok(); }

        const computedSignature = crypto.createHmac("sha256", order.komerce_callback_key).update(rawBody, "utf8").digest("hex");
        if (!receivedSignature || computedSignature !== receivedSignature) {
          console.error("[komerce-webhook] signature tidak cocok, request diabaikan:", invoiceNo);
          return ok();
        }

        try {
          const status = String(body.status || "").toUpperCase();
          const event = String(body.event || "");
          const isPaid = status === "PAID" || event === "payment.paid";

          const updatePayload: Record<string, unknown> = { komerce_raw_response: body, komerce_status: status || event };
          if (isPaid && order.status === "pending") {
            updatePayload.status = "paid";
            updatePayload.paid_at = new Date().toISOString();
            updatePayload.invoice_no = order.invoice_no ?? `INV-${order.serial}`;
          }
          const { error } = await supabase.from("store_orders").update(updatePayload).eq("id", order.id);
          if (error) { console.error("[komerce-webhook] gagal update order:", error.message); return ok(); }

          if (isPaid && order.status === "pending") {
            const contact = normalizeContact(order.buyer_email || order.buyer_whatsapp);
            const { error: voucherError } = await supabase.from("noble_vouchers").upsert(
              {
                code: order.serial,
                bound_contact: contact,
                tier: order.tier,
                duration_days: order.duration_days,
                status: "unused",
                note: `Store order ${order.id} (${order.plan_id}) — paid via Komerce`,
              },
              { onConflict: "code" },
            );
            if (voucherError) console.error("[komerce-webhook] order marked paid, tapi gagal issue voucher:", voucherError.message);
            else if (order.buyer_email) {
              const planLabel = PLANS.find((p) => p.id === order.plan_id)?.nameId ?? order.plan_id;
              await sendSerialEmail(order.buyer_email, order.buyer_name, planLabel, order.serial);
            }
          }
        } catch (e) {
          console.error("[komerce-webhook] unexpected error:", e instanceof Error ? e.message : String(e));
        }

        return ok();
      },
    },
  },
});

function ok() {
  return new Response("OK", { status: 200 });
}
