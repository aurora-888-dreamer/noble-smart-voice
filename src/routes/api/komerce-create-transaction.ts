import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";
import { createNobleSupabase } from "@/lib/supabase.server";

/**
 * POST /api/komerce-create-transaction
 *
 * Adapted from pulsaapps.shop's proven Komerce integration (same fix for
 * the per-transaction callback-key signature bug baked in from the start
 * — see komerce-webhook.ts for why that matters). Targets store_orders in
 * THIS project's own database (createNobleSupabase), not a separate one.
 *
 * Body: { invoiceNo, amount, paymentType: "qris" | "bank_transfer",
 *         channelCode?, customer: { name, email, phone }, items: [...] }
 */

const KOMERCE_SANDBOX_URL = "https://api-sandbox.collaborator.komerce.id";
const KOMERCE_PRODUCTION_URL = "https://api.collaborator.komerce.id";
const CALLBACK_URL = "https://noble-smart-voice.lovable.app/api/komerce-webhook";

async function getKomerceBaseUrl(supabase: ReturnType<typeof createNobleSupabase>): Promise<string> {
  if (!supabase) return KOMERCE_SANDBOX_URL;
  const { data } = await supabase.from("site_features").select("enabled").eq("key", "komerce_production_mode").maybeSingle();
  return data?.enabled ? KOMERCE_PRODUCTION_URL : KOMERCE_SANDBOX_URL;
}

export const Route = createFileRoute("/api/komerce-create-transaction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { invoiceNo, amount, paymentType, channelCode, customer, items } = body ?? {};

          if (!invoiceNo || !amount || !paymentType) return json({ error: "invoiceNo, amount, paymentType are required" }, 400);
          if (paymentType === "bank_transfer" && !channelCode) return json({ error: "channelCode is required for bank_transfer" }, 400);
          if (!customer?.name || !customer?.email || !customer?.phone) return json({ error: "customer.name/email/phone are required" }, 400);
          if (!Array.isArray(items) || items.length === 0) return json({ error: "items are required" }, 400);
          if (!process.env.KOMERCE_API_KEY) return json({ error: "Server not configured (KOMERCE_API_KEY)" }, 500);

          const supabase = createNobleSupabase();
          if (!supabase) return json({ error: "Server not configured" }, 500);

          const orderSerial = invoiceNo.replace(/^INV-/, "");
          const { data: order, error: findError } = await supabase.from("store_orders").select("id, serial").eq("serial", orderSerial).maybeSingle();
          if (findError || !order) {
            console.error("[komerce-create-transaction] order not found for serial:", orderSerial, "invoiceNo received:", invoiceNo, "db error:", findError?.message);
            return json({ error: "Order not found" }, 404);
          }

          const callbackApiKey = randomBytes(32).toString("hex");
          const { error: updateError } = await supabase
            .from("store_orders")
            .update({ komerce_callback_key: callbackApiKey, komerce_channel_code: paymentType === "qris" ? "qris" : channelCode })
            .eq("id", order.id);
          if (updateError) return json({ error: "Failed to prepare transaction" }, 500);

          const komercePayload: Record<string, unknown> = {
            payment_type: paymentType,
            amount,
            order_id: invoiceNo,
            customer,
            items,
            callback_url: CALLBACK_URL,
            callback_api_key: callbackApiKey,
          };
          if (paymentType === "bank_transfer") komercePayload.channel_code = channelCode;

          const komerceBaseUrl = await getKomerceBaseUrl(supabase);
          const res = await fetch(`${komerceBaseUrl}/user/api/v1/user/payment/create`, {
            method: "POST",
            headers: { "x-api-key": process.env.KOMERCE_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify(komercePayload),
          });
          const data = await res.json();
          if (!res.ok) return json({ error: data?.meta?.message ?? "Failed to create Komerce transaction", detail: data }, 502);

          const paymentId = data?.data?.payment_id ?? null;
          if (paymentId) await supabase.from("store_orders").update({ komerce_merchant_ref: paymentId }).eq("id", order.id);

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
