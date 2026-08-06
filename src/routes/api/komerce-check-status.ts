import { createFileRoute } from "@tanstack/react-router";
import { createNobleSupabase } from "@/lib/supabase.server";

/**
 * GET /api/komerce-check-status?invoiceNo=xxx
 * Polled from the order/receipt page every few seconds while waiting for
 * payment. Adapted from pulsaapps' proven pattern.
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

          const { data: order, error } = await supabase.from("store_orders").select("komerce_merchant_ref, status").eq("invoice_no", invoiceNo).maybeSingle();
          if (error || !order) return json({ error: "Order tidak ditemukan" }, 404);
          // Already confirmed via webhook — no need to hit Komerce again.
          if (order.status === "paid" || order.status === "delivered") return json({ data: { status: "PAID" } }, 200);
          if (!order.komerce_merchant_ref) return json({ data: { status: "PENDING" } }, 200);

          const komerceBaseUrl = await getKomerceBaseUrl(supabase);
          const res = await fetch(`${komerceBaseUrl}/user/api/v1/user/payment/${order.komerce_merchant_ref}/status`, {
            headers: { "x-api-key": process.env.KOMERCE_API_KEY },
          });
          const data = await res.json();
          if (!res.ok) return json({ error: data?.meta?.message ?? "Gagal cek status" }, 502);
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
