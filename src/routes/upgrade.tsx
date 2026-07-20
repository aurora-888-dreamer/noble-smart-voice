import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crown, Check, Tag, Users, ArrowRight } from "lucide-react";
import { PLANS, formatIDR, type PlanId } from "@/lib/aurora-store";
import {
  useUserGroupId, setUserGroupId, findGroupByCode, bestDiscountFor,
  useGroups, useDiscounts,
} from "@/lib/discounts-store";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade — NOBLE Smart Voice" },
      { name: "description", content: "Unlock Premium — pick a plan and apply your group code for exclusive discounts." },
    ],
  }),
  component: UpgradePage,
});

function UpgradePage() {
  const navigate = useNavigate();
  const userGroupId = useUserGroupId();
  const groups = useGroups();
  // Re-render when discounts change (validity/toggle from admin)
  useDiscounts();

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const currentGroup = useMemo(
    () => groups.find((g) => g.id === userGroupId) || null,
    [groups, userGroupId],
  );

  function redeem() {
    const g = findGroupByCode(code);
    if (!g) { setMsg("Invalid group code."); return; }
    setUserGroupId(g.id);
    setCode("");
    setMsg(`Group applied: ${g.name}`);
    setTimeout(() => setMsg(null), 2000);
  }

  function clearGroup() {
    setUserGroupId(null);
    setMsg("Group cleared.");
    setTimeout(() => setMsg(null), 1500);
  }

  function choosePlan(planId: PlanId) {
    const best = bestDiscountFor(planId, userGroupId);
    navigate({
      to: "/store/order",
      search: {
        plan: planId,
        ...(best ? { discount: best.discount.id } : {}),
        ...(userGroupId ? { group: userGroupId } : {}),
      } as never,
    });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-xs text-muted-foreground underline">← Back to Home</Link>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">User Upgrade</span>
        </div>

        {/* Hero */}
        <section className="text-center py-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-[11px] tracking-widest uppercase">
            <Crown size={12} /> Upgrade to Premium
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
            Choose your plan
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            All plans unlock every Premium feature and plugin. Have a group code?
            Enter it below to reveal exclusive pricing.
          </p>
        </section>

        {/* Group code */}
        <section className="rounded-2xl bg-card border border-border p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-primary" />
            <h2 className="text-sm font-semibold">Group code</h2>
          </div>
          {currentGroup ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                Active group:{" "}
                <span className="font-semibold text-primary">{currentGroup.name}</span>{" "}
                <code className="text-[11px] font-mono text-muted-foreground">({currentGroup.code})</code>
              </div>
              <button
                onClick={clearGroup}
                className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. EARLYBIRD"
                className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none font-mono tracking-wider"
              />
              <button
                onClick={redeem}
                disabled={!code.trim()}
                className="rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
          {msg && <p className="text-xs text-primary mt-2">{msg}</p>}
        </section>

        {/* Plans */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((p) => {
            const best = bestDiscountFor(p.id, userGroupId);
            const finalPrice = best ? best.finalPrice : p.priceIDR;
            const discounted = !!best;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 flex flex-col ${
                  p.highlight
                    ? "border-primary/60 bg-gradient-to-br from-primary/15 to-primary/5"
                    : "border-border bg-card"
                }`}
              >
                {p.highlight && (
                  <div className="self-start rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 mb-2">
                    Best Value
                  </div>
                )}
                <div className="text-xs text-muted-foreground uppercase tracking-widest">{p.tier}</div>
                <div className="text-lg font-semibold mt-1">{p.name}</div>

                <div className="mt-3">
                  {discounted && (
                    <div className="text-xs text-muted-foreground line-through">
                      {formatIDR(p.priceIDR)}
                    </div>
                  )}
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {formatIDR(finalPrice)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {p.durationDays == null ? "One-time · lifetime" : `${p.durationDays} days`}
                  </div>
                  {discounted && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5">
                      <Tag size={10} /> {best!.discount.name}
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-1.5 text-xs">
                  {["All Premium features", "All plugins unlocked", "Serial number delivery"].map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check size={14} className="text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => choosePlan(p.id)}
                  className="mt-5 inline-flex items-center justify-center gap-1 rounded-full bg-primary text-primary-foreground py-2 text-sm font-semibold hover:opacity-90"
                >
                  Choose <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </section>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          Need help? Contact AURORA MASTER via WhatsApp after ordering.
        </p>
      </div>
    </div>
  );
}
