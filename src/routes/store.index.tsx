import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic, Calendar, CheckSquare, Users, MapPin, Bell, Camera, Calculator,
  Languages, Fingerprint, ShieldCheck, WifiOff, Cloud, Sparkles, Check, Crown,
} from "lucide-react";
import { PLANS, formatIDR } from "@/lib/aurora-store";

export const Route = createFileRoute("/store/")({
  component: StoreLanding,
});

const FEATURES = [
  { icon: Mic,        title: "Voice-first Capture",       desc: "Wake with \"Aurora Start\", dictate notes, tasks, meetings, and appointments hands-free." },
  { icon: Sparkles,   title: "AI Auto-Categorize",        desc: "Phi, Gemma, Qwen and Gemini analyze your voice and file it into the right menu." },
  { icon: Calendar,   title: "Calendar & Reminders",      desc: "Month view, alarm reminders, and dated filters across every menu." },
  { icon: CheckSquare,title: "Tasks & Projects",          desc: "Priorities, due dates, and multi-select bulk actions." },
  { icon: Users,      title: "Contacts & Meetings",       desc: "Attendees, action items, and one-tap dial." },
  { icon: MapPin,     title: "Trips & Appointments",      desc: "Locations, dates, and route-ready reminders." },
  { icon: Bell,       title: "Alarm Reminders",           desc: "Local, offline reminders that survive without internet." },
  { icon: Camera,     title: "Camera & Photo Carousel",   desc: "Capture, attach, and browse photos inside Noble." },
  { icon: Calculator, title: "Built-in Calculator",       desc: "Quick math from Home or the sidebar." },
  { icon: Languages,  title: "Bilingual Translator",      desc: "AI translation for notes, diary, and any capture." },
  { icon: Fingerprint,title: "PIN + Biometric",           desc: "6-digit keypad or WebAuthn fingerprint/face unlock." },
  { icon: WifiOff,    title: "Offline-first",             desc: "Local IndexedDB. Nothing leaves your device unless you send it." },
  { icon: Cloud,      title: "Backup & Sync",             desc: "Export to laptop, Google Drive, or transfer via Bluetooth/Nearby Share." },
  { icon: ShieldCheck,title: "Private by Design",         desc: "PIN-locked, encrypted-at-rest, no accounts, no ads." },
];

function StoreLanding() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-6 md:pt-14 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-[11px] tracking-widest uppercase">
          <Crown size={12} /> Aurora Master · Digital & Kreatif
        </div>
        <h1
          className="mt-5 text-4xl md:text-6xl leading-[1.05]"
          style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)" }}
        >
          NOBLE <span className="text-primary">Smart Voice</span>
        </h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground">
          The executive voice assistant — local-first, bilingual, and installable on any phone or laptop.
          Buy once, download, activate with a serial number. No accounts required to use the app.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/store/order"
            className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90"
          >
            Order Now
          </Link>
          <a
            href="#plans"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary"
          >
            See Plans
          </a>
          <Link
            to="/"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary"
          >
            Try the App
          </Link>
        </div>
      </section>

      {/* Feature grid / Specification list */}
      <section>
        <h2 className="text-2xl md:text-3xl mb-2" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Specification List
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Everything included in Noble Smart Voice, out of the box.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card border border-border p-4">
              <f.icon className="text-primary mb-2" size={20} />
              <div className="font-semibold text-sm">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans">
        <h2 className="text-2xl md:text-3xl mb-2" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Subscription Plans
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Every plan unlocks Premium features and all built-in plugins.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((p) => (
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
              <div className="text-sm text-muted-foreground uppercase tracking-widest">{p.tier}</div>
              <div className="text-lg font-semibold mt-1">{p.name}</div>
              <div className="mt-3 text-3xl font-bold">{formatIDR(p.priceIDR)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.durationDays == null ? "One-time · lifetime" : `${p.durationDays} days access`}
              </div>
              <ul className="mt-4 space-y-1.5 text-xs">
                {["All Premium features", "All plugins unlocked", "Serial number delivery", "Bilingual support"].map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/store/order"
                search={{ plan: p.id } as never}
                className="mt-5 rounded-full bg-primary text-primary-foreground py-2 text-sm font-semibold text-center hover:opacity-90"
              >
                Choose {p.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl md:text-3xl mb-6" style={{ fontFamily: "var(--font-serif, serif)" }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { n: 1, t: "Choose a plan", d: "Pick monthly, quarterly, yearly, or lifetime." },
            { n: 2, t: "Pay via QRIS", d: "Scan our QRIS with any Indonesian bank or e-wallet." },
            { n: 3, t: "Get your Serial", d: "We verify payment and issue your Serial Number." },
            { n: 4, t: "Activate", d: "Open Noble → Activate → paste your serial. Done." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-card border border-border p-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary grid place-items-center font-bold">
                {s.n}
              </div>
              <div className="mt-3 font-semibold">{s.t}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 p-8 text-center">
        <Crown className="mx-auto text-primary mb-3" size={32} />
        <h3 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Ready to upgrade to Premium?
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Order in minutes, pay via QRIS, and get your Serial Number by WhatsApp or email.
        </p>
        <Link
          to="/store/order"
          className="inline-block mt-5 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold"
        >
          Start Order
        </Link>
      </section>
    </div>
  );
}
