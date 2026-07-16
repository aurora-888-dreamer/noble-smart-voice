import { createFileRoute } from "@tanstack/react-router";
import {
  Fingerprint, ShieldCheck, Cloud, CloudOff, Plus, Calendar, CheckSquare,
  Plane, FileText, Lock, Eye, EyeOff, Mic, ScanLine, Bell, ArrowUpRight,
  Users, Building2, HeartPulse, KeyRound, FileSignature, PenLine, Phone,
  Activity, ChevronRight, Sparkles, Crown, BookLock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Noble — The Executive Memorandum Platform" },
      { name: "description", content: "A local-first, end-to-end encrypted memorandum platform for principals, personal assistants, and operational staff." },
      { property: "og:title", content: "Noble — The Executive Memorandum Platform" },
      { property: "og:description", content: "Deep navy. Champagne gold. Military-grade security for the modern executive." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-[var(--font-sans)]">
      <Nav />
      <Hero />
      <Pillars />
      <DeviceShowcase />
      <RolesMatrix />
      <VaultSection />
      <SyncEngine />
      <Continuity />
      <Footer />
    </div>
  );
}

/* ---------- Shared atoms ---------- */

const serif = { fontFamily: "var(--font-serif)" } as const;

function GoldText({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--gold)" }}>{children}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase" style={{ color: "var(--gold)" }}>
      <span className="h-px w-8" style={{ background: "var(--gold)" }} />
      {children}
    </div>
  );
}

/* ---------- Nav ---------- */

function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5" style={{ color: "var(--gold)" }} />
          <span className="text-xl tracking-wide" style={serif}>Noble</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#platform" className="hover:text-foreground transition">Platform</a>
          <a href="#devices" className="hover:text-foreground transition">Devices</a>
          <a href="#roles" className="hover:text-foreground transition">Roles</a>
          <a href="#vault" className="hover:text-foreground transition">Vault</a>
          <a href="#continuity" className="hover:text-foreground transition">Continuity</a>
        </nav>
        <button
          className="text-xs tracking-widest uppercase px-4 py-2 rounded-sm border"
          style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
        >
          Request Access
        </button>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(800px 400px at 80% -10%, oklch(0.74 0.11 80 / 0.18), transparent 60%), radial-gradient(600px 400px at 0% 100%, oklch(0.32 0.06 260 / 0.6), transparent 60%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <SectionLabel>The Executive Memorandum Platform</SectionLabel>
          <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight" style={serif}>
            A private command for a <GoldText>noble</GoldText> life.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Noble unifies your diary, calendar, contracts and vault into a single, local-first
            sanctuary — orchestrated with your Personal Assistant and protected by end-to-end encryption.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              className="px-6 py-3 text-sm tracking-widest uppercase rounded-sm font-medium"
              style={{ background: "var(--gradient-gold)", color: "var(--primary-foreground)", boxShadow: "var(--shadow-gold)" }}
            >
              Enter the Gateway
            </button>
            <button className="px-6 py-3 text-sm tracking-widest uppercase rounded-sm border border-border text-foreground hover:border-foreground/40 transition">
              View the Brief
            </button>
          </div>
          <div className="mt-12 flex flex-wrap gap-8 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-2"><Lock className="h-4 w-4" style={{ color: "var(--gold)" }}/> End-to-End Encrypted</div>
            <div className="flex items-center gap-2"><CloudOff className="h-4 w-4" style={{ color: "var(--gold)" }}/> Local-First</div>
            <div className="flex items-center gap-2"><Activity className="h-4 w-4" style={{ color: "var(--gold)" }}/> Audited</div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <PhoneFrame>
            <PhoneDashboard />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/* ---------- Phone Frame ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-[320px] h-[640px] rounded-[44px] p-2 border"
      style={{
        background: "linear-gradient(160deg, oklch(0.22 0.04 260), oklch(0.14 0.04 260))",
        borderColor: "oklch(0.32 0.03 260)",
        boxShadow: "var(--shadow-noble)",
      }}
    >
      <div className="relative w-full h-full rounded-[36px] overflow-hidden" style={{ background: "var(--navy-deep)" }}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-28 rounded-full bg-black z-10" />
        {children}
      </div>
    </div>
  );
}

function PhoneDashboard() {
  return (
    <div className="h-full w-full flex flex-col text-foreground">
      <div className="pt-10 px-5 pb-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>9:41</span>
        <div className="flex items-center gap-1" style={{ color: "var(--gold)" }}>
          <ShieldCheck className="h-3 w-3" /> Encrypted
        </div>
      </div>
      <div className="px-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Good Morning</div>
            <div className="text-xl mt-1" style={serif}>Mr. Wijaya</div>
          </div>
          <div className="h-10 w-10 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--gold)" }}>
            <Crown className="h-4 w-4" style={{ color: "var(--gold)" }} />
          </div>
        </div>

        <div className="mt-5 rounded-2xl p-4 border" style={{ background: "var(--gradient-noble)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Next Meeting</span>
            <span style={{ color: "var(--gold)" }}>10:30 AM</span>
          </div>
          <div className="mt-2 text-base" style={serif}>Board Review — Q3 Capital</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Bali Room · with Sarah, PA</div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" /> 6 attendees
            <span className="mx-1">·</span>
            <FileText className="h-3 w-3" /> 3 docs
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniCard icon={<CheckSquare className="h-3.5 w-3.5" />} label="Urgent Tasks" value="3" />
          <MiniCard icon={<Plane className="h-3.5 w-3.5" />} label="SIN Flight" value="4h 30m" />
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Today's Focus</div>
        <div className="mt-2 space-y-2">
          {[
            { t: "Sign deed amendment", s: "Legal · 11:00" },
            { t: "Review insurance renewal", s: "Vault · 14:30" },
            { t: "Call Dr. Andersen", s: "Medical · 16:00" },
          ].map((x) => (
            <div key={x.t} className="flex items-center justify-between rounded-lg px-3 py-2.5 border border-border bg-card">
              <div>
                <div className="text-xs">{x.t}</div>
                <div className="text-[10px] text-muted-foreground">{x.s}</div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto" />
      <div className="px-5 pb-6 pt-4 flex items-center justify-between">
        <button className="h-11 w-11 rounded-full flex items-center justify-center border border-border"><Calendar className="h-4 w-4 text-muted-foreground" /></button>
        <button className="h-11 w-11 rounded-full flex items-center justify-center border border-border"><Mic className="h-4 w-4 text-muted-foreground" /></button>
        <button
          className="h-14 w-14 -mt-6 rounded-full flex items-center justify-center"
          style={{ background: "var(--gradient-gold)", color: "var(--primary-foreground)", boxShadow: "var(--shadow-gold)" }}
        >
          <Plus className="h-5 w-5" />
        </button>
        <button className="h-11 w-11 rounded-full flex items-center justify-center border border-border"><ScanLine className="h-4 w-4 text-muted-foreground" /></button>
        <button className="h-11 w-11 rounded-full flex items-center justify-center border border-border"><BookLock className="h-4 w-4 text-muted-foreground" /></button>
      </div>
    </div>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 border border-border bg-card">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span style={{ color: "var(--gold)" }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-lg" style={serif}>{value}</div>
    </div>
  );
}

/* ---------- Pillars ---------- */

function Pillars() {
  const items = [
    { icon: Fingerprint, t: "Biometric Gateway", d: "Every session begins with a fingerprint or face — no data appears before you do." },
    { icon: Lock, t: "End-to-End Encryption", d: "Master key held by the Owner; shared secrets unlock only what's delegated." },
    { icon: CloudOff, t: "Local-First Sync", d: "Devices hold the source of truth. P2P relays reconcile via SyncQueue." },
    { icon: Activity, t: "Audit & Trust", d: "Every view, every edit — by the PA or Assistant — written to an immutable log." },
  ];
  return (
    <section id="platform" className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-xl">
            <SectionLabel>Foundations</SectionLabel>
            <h2 className="mt-4 text-4xl md:text-5xl tracking-tight" style={serif}>Architecture of <GoldText>discretion</GoldText>.</h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Four pillars carry the Noble platform — drawn from the security layer of the
            Daily Memorandum architecture.
          </p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
          {items.map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-background p-8 group hover:bg-card transition">
              <Icon className="h-6 w-6" style={{ color: "var(--gold)" }} />
              <div className="mt-6 text-xl" style={serif}>{t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Device Showcase: Tablet command center ---------- */

function DeviceShowcase() {
  return (
    <section id="devices" className="border-t border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-4">
            <SectionLabel>The Command Center</SectionLabel>
            <h2 className="mt-4 text-4xl md:text-5xl tracking-tight" style={serif}>
              One ledger,<br /> three viewports.
            </h2>
            <p className="mt-6 text-muted-foreground">
              Mobile is the executive remote. Tablet is the planning surface — pencil-ready
              for signatures and handwritten Noble Memos. Web becomes the command center
              for assistants managing bulk operations.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { k: "Mobile", v: "Biometric login, voice memos, daily focus." },
                { k: "Tablet", v: "Split-view planning, e-sign, handwriting." },
                { k: "Web", v: "Kanban projects, vault administration, audit." },
              ].map((x) => (
                <div key={x.k} className="flex gap-4 border-l-2 pl-4" style={{ borderColor: "var(--gold)" }}>
                  <div className="text-xs uppercase tracking-widest w-16" style={{ color: "var(--gold)" }}>{x.k}</div>
                  <div className="text-sm text-muted-foreground">{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <TabletFrame />
          </div>
        </div>
      </div>
    </section>
  );
}

function TabletFrame() {
  return (
    <div
      className="rounded-[28px] p-3 border"
      style={{
        background: "linear-gradient(160deg, oklch(0.22 0.04 260), oklch(0.14 0.04 260))",
        borderColor: "oklch(0.32 0.03 260)",
        boxShadow: "var(--shadow-noble)",
      }}
    >
      <div className="rounded-[20px] overflow-hidden border border-border" style={{ background: "var(--navy-deep)" }}>
        <div className="flex">
          {/* Sidebar */}
          <div className="w-16 border-r border-border py-6 flex flex-col items-center gap-5 text-muted-foreground">
            <Crown className="h-5 w-5" style={{ color: "var(--gold)" }} />
            <div className="h-px w-6 bg-border my-1" />
            {[Calendar, CheckSquare, FileText, Users, BookLock, Activity].map((I, i) => (
              <I key={i} className={`h-4 w-4 ${i === 0 ? "text-foreground" : ""}`} />
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 grid grid-cols-2 min-h-[520px]">
            {/* Calendar */}
            <div className="border-r border-border p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Tuesday</div>
                <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--gold)" }}>
                  <Cloud className="h-3 w-3" /> Synced
                </div>
              </div>
              <div className="mt-1 text-2xl" style={serif}>March 4, 2026</div>

              <div className="mt-6 space-y-2.5">
                {[
                  { t: "08:00", a: "Briefing with Sarah", k: "PA" },
                  { t: "10:30", a: "Board Review — Q3 Capital", k: "Meeting" },
                  { t: "12:30", a: "Lunch · Park Hyatt", k: "Personal" },
                  { t: "15:00", a: "Sign deed amendment", k: "Legal" },
                  { t: "19:30", a: "Flight SQ 824 → SIN", k: "Trip" },
                ].map((e, i) => (
                  <div key={i} className="flex gap-3 rounded-md p-3 border border-border bg-card">
                    <div className="w-12 text-[11px] text-muted-foreground tabular-nums">{e.t}</div>
                    <div className="flex-1">
                      <div className="text-sm">{e.a}</div>
                      <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--gold)" }}>{e.k}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project / delegation */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Project</div>
                <div className="text-[10px] text-muted-foreground">3 owners · 12 tasks</div>
              </div>
              <div className="mt-1 text-2xl" style={serif}>Singapore Acquisition</div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {["Discovery", "Diligence", "Closing"].map((c, i) => (
                  <div key={c} className="rounded-md border border-border bg-card p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c}</div>
                    <div className="mt-2 text-lg" style={serif}>{[5, 4, 3][i]}</div>
                    <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full" style={{ width: `${[90, 60, 20][i]}%`, background: "var(--gold)" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-[10px] uppercase tracking-widest text-muted-foreground">Action Items</div>
              <div className="mt-2 space-y-2">
                {[
                  { t: "Send NDA to counsel", w: "Sarah · PA", s: "Due today" },
                  { t: "Compile asset register", w: "Marco · Asst", s: "In progress" },
                  { t: "Owner sign-off", w: "Mr. Wijaya", s: "Awaiting" },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5">
                    <div>
                      <div className="text-xs">{a.t}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{a.w}</div>
                    </div>
                    <div className="text-[10px]" style={{ color: i === 2 ? "var(--gold)" : undefined }}>{a.s}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-md border border-border px-3 py-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2"><Activity className="h-3 w-3" style={{ color: "var(--gold)" }} /> Audit</div>
                <div>Assistant updated Trip Schedule · 2m ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Roles matrix ---------- */

function RolesMatrix() {
  const rows: { f: string; o: string; p: string; a: string }[] = [
    { f: "Productivity — Tasks, Calendar, Projects", o: "View & Approve", p: "Create, Edit, Manage", a: "View & Execute" },
    { f: "Personal Records — Medical, Legal, Secret", o: "Full (Decrypted)", p: "If delegated", a: "—" },
    { f: "Financials — Assets, Banks, Bills", o: "Full Access", p: "Bill Payments", a: "—" },
    { f: "Security — Audit, Vault", o: "Review Logs", p: "—", a: "—" },
  ];
  return (
    <section id="roles" className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <SectionLabel>Role-Based Access</SectionLabel>
          <h2 className="mt-4 text-4xl md:text-5xl tracking-tight" style={serif}>
            Three keys.<br /> One <GoldText>noble trust</GoldText>.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Authority is layered. The Owner sees everything; the Personal Assistant orchestrates;
            the Assistant executes — and Noble remembers who did what, when.
          </p>
        </div>

        <div className="mt-12 rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-4 text-xs uppercase tracking-widest text-muted-foreground border-b border-border" style={{ background: "var(--navy-deep)" }}>
            <div className="p-4">Capability</div>
            <div className="p-4 flex items-center gap-2"><Crown className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} /> Owner</div>
            <div className="p-4 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} /> Personal Assistant</div>
            <div className="p-4 flex items-center gap-2"><Users className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} /> Assistant</div>
          </div>
          {rows.map((r, i) => (
            <div key={r.f} className={`grid grid-cols-4 text-sm ${i !== rows.length - 1 ? "border-b border-border" : ""}`}>
              <div className="p-4 text-foreground" style={serif}>{r.f}</div>
              <div className="p-4 text-muted-foreground">{r.o}</div>
              <div className="p-4 text-muted-foreground">{r.p}</div>
              <div className="p-4 text-muted-foreground">{r.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Vault ---------- */

function VaultSection() {
  const tiles = [
    { icon: HeartPulse, t: "Medical Record", d: "Vitals, allergies, insurers." },
    { icon: FileSignature, t: "Legal & Deeds", d: "Notarized, OCR-archived." },
    { icon: Lock, t: "Secret Notes", d: "Double-lock biometrics." },
    { icon: Building2, t: "Assets & Banks", d: "Net worth, accounts, references." },
    { icon: KeyRound, t: "Password Archive", d: "Vault items, encrypted at rest." },
    { icon: PenLine, t: "Insurance Vault", d: "Policies & renewal alerts." },
  ];
  return (
    <section id="vault" className="border-t border-border relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: "radial-gradient(600px 300px at 20% 100%, oklch(0.74 0.11 80 / 0.1), transparent 70%)" }}
      />
      <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <SectionLabel>The Digital Vault</SectionLabel>
          <h2 className="mt-4 text-4xl md:text-5xl tracking-tight" style={serif}>
            Lockboxes for a <GoldText>life of consequence</GoldText>.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Sensitive records live behind a second biometric. A confidential
            watermark deters screenshots; privacy mode blurs balances when a stranger walks behind.
          </p>

          <div className="mt-8 flex items-center gap-3 rounded-md border border-border p-4 bg-card">
            <EyeOff className="h-5 w-5" style={{ color: "var(--gold)" }} />
            <div>
              <div className="text-sm">Privacy Mask is on</div>
              <div className="text-[11px] text-muted-foreground">Asset values blurred until biometric confirm.</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-md border border-border p-4 bg-card">
            <Bell className="h-5 w-5" style={{ color: "var(--gold)" }} />
            <div>
              <div className="text-sm">Passport expires in 47 days</div>
              <div className="text-[11px] text-muted-foreground">Auto-detected from OCR scan, Sept 2023.</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tiles.map(({ icon: Icon, t, d }) => (
              <div key={t} className="group relative rounded-lg border border-border bg-card p-5 overflow-hidden hover:-translate-y-0.5 transition">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition" style={{ background: "linear-gradient(180deg, transparent, oklch(0.74 0.11 80 / 0.05))" }} />
                <div className="relative">
                  <div className="h-10 w-10 rounded-md flex items-center justify-center border border-border" style={{ background: "var(--navy-deep)" }}>
                    <Icon className="h-4 w-4" style={{ color: "var(--gold)" }} />
                  </div>
                  <div className="mt-4 text-lg" style={serif}>{t}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{d}</div>
                  <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted</span>
                    <span className="flex items-center gap-1" style={{ color: "var(--gold)" }}>Open <ArrowUpRight className="h-3 w-3" /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-[11px] text-muted-foreground flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
            "Noble — Confidential" watermark overlays every vault screen on tablet & web.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Continuity ---------- */

function Continuity() {
  return (
    <section id="continuity" className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <div className="rounded-lg border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-noble)" }}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Life Continuity</div>
              <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--gold)" }}>
                <ShieldCheck className="h-3 w-3" /> Time-locked
              </div>
            </div>
            <div className="mt-2 text-2xl" style={serif}>Emergency Access Handover</div>

            <div className="mt-6 space-y-3">
              {[
                { n: "Sarah Lim", r: "Personal Assistant", g: ["Insurance Vault", "Password Archive"] },
                { n: "Andre Wijaya", r: "Family · Brother", g: ["Family & Emergency Info"] },
              ].map((p) => (
                <div key={p.n} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">{p.n}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.r}</div>
                    </div>
                    <div className="h-5 w-9 rounded-full p-0.5" style={{ background: "var(--gold)" }}>
                      <div className="h-full w-4 rounded-full bg-background ml-auto" />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.g.map((g) => (
                      <span key={g} className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-border text-muted-foreground">{g}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-4">
              <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} /> Last audit · 3 days ago</div>
              <button className="flex items-center gap-1" style={{ color: "var(--gold)" }}>
                View Trail <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2">
          <SectionLabel>Continuity & Care</SectionLabel>
          <h2 className="mt-4 text-4xl md:text-5xl tracking-tight" style={serif}>
            When you cannot answer, <GoldText>Noble can</GoldText>.
          </h2>
          <p className="mt-5 text-muted-foreground max-w-lg">
            Grant your PA temporary decryption keys for select vaults under emergency conditions.
            Time-locked, revocable, fully audited — peace of mind without surrendering control.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { i: Phone, t: "One-tap dial" },
              { i: ShieldCheck, t: "Dead-man's switch" },
              { i: Activity, t: "Transparent trail" },
            ].map(({ i: I, t }) => (
              <div key={t} className="rounded-md border border-border p-4">
                <I className="h-4 w-4" style={{ color: "var(--gold)" }} />
                <div className="mt-3 text-sm">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4" style={{ color: "var(--gold)" }} />
          <span className="text-lg" style={serif}>Noble</span>
          <span className="text-xs text-muted-foreground ml-3">© {new Date().getFullYear()} — A private memorandum.</span>
        </div>
        <div className="flex items-center gap-6 text-xs uppercase tracking-widest text-muted-foreground">
          <a href="#">Security</a>
          <a href="#">Architecture</a>
          <a href="#">Concierge</a>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Sync Engine ---------- */

type SyncOp = "create" | "update" | "delete";
type SyncStatus = "queued" | "syncing" | "conflict" | "resolved" | "delivered";

interface SyncEntry {
  id: string;
  entity: string;
  field: string;
  op: SyncOp;
  value: string;
  paVersion: number;
  ownerVersion: number;
  ts: number;
  status: SyncStatus;
  resolution?: "lww-pa" | "lww-owner" | "merged";
}

const ENTITY_SEED: Array<Omit<SyncEntry, "id" | "ts" | "status">> = [
  { entity: "Calendar", field: "Board Meeting · 14:00", op: "update", value: "Move → 15:30", paVersion: 4, ownerVersion: 3 },
  { entity: "Travel", field: "G650 · LHR → NCE", op: "update", value: "Wheels up 09:10", paVersion: 7, ownerVersion: 7 },
  { entity: "Task", field: "Brief: Q3 Holdings", op: "create", value: "Assign → Counsel", paVersion: 1, ownerVersion: 0 },
  { entity: "Contact", field: "Dr. Halberg", op: "update", value: "+41 22 555 0114", paVersion: 2, ownerVersion: 2 },
  { entity: "Calendar", field: "Dinner · Villa d'Este", op: "update", value: "Party of 6 → 8", paVersion: 5, ownerVersion: 6 },
  { entity: "Task", field: "Wire · Geneva Trust", op: "update", value: "Hold pending sign-off", paVersion: 3, ownerVersion: 3 },
  { entity: "Note", field: "Memo · Acquisition", op: "update", value: "Append clause 7.2", paVersion: 9, ownerVersion: 8 },
];

function SyncEngine() {
  const [queue, setQueue] = useState<SyncEntry[]>([]);
  const [delivered, setDelivered] = useState<SyncEntry[]>([]);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  // Generate new PA mutation every 2.6s
  useEffect(() => {
    const t = setInterval(() => {
      const seed = ENTITY_SEED[seq.current % ENTITY_SEED.length];
      seq.current += 1;
      const id = `m-${Date.now().toString(36)}-${seq.current}`;
      setQueue((q) => [
        { ...seed, id, ts: Date.now(), status: "queued" as SyncStatus },
        ...q,
      ].slice(0, 6));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  // Drive lifecycle: queued → syncing → (conflict→resolved) → delivered
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setQueue((prev) => {
      const next: SyncEntry[] = [];
      const toDeliver: SyncEntry[] = [];
      for (const e of prev) {
        if (e.status === "queued") {
          next.push({ ...e, status: "syncing" });
        } else if (e.status === "syncing") {
          if (e.ownerVersion > e.paVersion) {
            next.push({ ...e, status: "conflict" });
          } else {
            next.push({ ...e, status: "resolved", resolution: "lww-pa" });
          }
        } else if (e.status === "conflict") {
          // Last-write-wins by timestamp (PA push is newer)
          next.push({ ...e, status: "resolved", resolution: e.op === "update" ? "merged" : "lww-pa" });
        } else if (e.status === "resolved") {
          toDeliver.push({ ...e, status: "delivered" });
        }
      }
      if (toDeliver.length) {
        setDelivered((d) => [...toDeliver, ...d].slice(0, 4));
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <section className="px-6 py-24 md:py-32 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Sync Engine</SectionLabel>
          <h2 className="text-4xl md:text-5xl mt-4" style={serif}>
            From the <GoldText>Assistant's desk</GoldText> to the principal's pocket
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Every mutation is enqueued, versioned, and reconciled. Conflicts resolve via last-write-wins with
            field-level merge — then push end-to-end encrypted to the Owner's device.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr_1fr] gap-6 items-stretch">
          {/* PA Web pane */}
          <Pane title="PA · Web Console" icon={<Building2 className="w-4 h-4" />} side="left">
            <div className="space-y-2">
              {queue.filter((e) => e.status === "queued" || e.status === "syncing").slice(0, 4).map((e) => (
                <div key={e.id} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{e.entity}</span>
                    <span>v{e.paVersion}</span>
                  </div>
                  <div className="text-sm mt-1">{e.field}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{e.value}</div>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="text-xs text-muted-foreground py-8 text-center">Awaiting input…</div>
              )}
            </div>
          </Pane>

          {/* Sync Queue */}
          <Pane title="SyncQueue · Reconciliation" icon={<Activity className="w-4 h-4 animate-pulse" style={{ color: "var(--gold)" }} />} highlight>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] uppercase tracking-widest text-muted-foreground px-2 pb-2 border-b border-white/5">
                <span>Mutation</span><span>Versions</span><span>Status</span>
              </div>
              {queue.length === 0 && (
                <div className="text-xs text-muted-foreground py-8 text-center">Queue idle.</div>
              )}
              {queue.map((e) => (
                <div key={e.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-2 py-2 rounded border border-transparent hover:border-white/5 transition">
                  <div className="min-w-0">
                    <div className="text-xs truncate">
                      <span className="text-muted-foreground mr-1.5">[{e.op}]</span>{e.field}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{e.entity} · {e.id.slice(-6)}</div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {e.paVersion}→{Math.max(e.paVersion, e.ownerVersion) + (e.status === "resolved" || e.status === "delivered" ? 1 : 0)}
                  </div>
                  <StatusBadge status={e.status} resolution={e.resolution} />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" style={{ color: "var(--gold)" }} /> AES-256 · E2EE</span>
              <span>Strategy: LWW + field-merge</span>
            </div>
          </Pane>

          {/* Owner Mobile pane */}
          <Pane title="Owner · Mobile" icon={<Crown className="w-4 h-4" style={{ color: "var(--gold)" }} />} side="right">
            <div className="space-y-2">
              {delivered.map((e) => (
                <div key={e.id} className="rounded-md border border-white/10 p-3" style={{ background: "linear-gradient(180deg, rgba(197,160,89,0.08), transparent)" }}>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>
                    <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> {e.entity}</span>
                    <span>delivered</span>
                  </div>
                  <div className="text-sm mt-1">{e.field}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{e.value}</div>
                </div>
              ))}
              {delivered.length === 0 && (
                <div className="text-xs text-muted-foreground py-8 text-center">No new pushes.</div>
              )}
            </div>
          </Pane>
        </div>
      </div>
    </section>
  );
}

function Pane({ title, icon, children, highlight, side }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; highlight?: boolean; side?: "left" | "right";
}) {
  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{
        borderColor: highlight ? "rgba(197,160,89,0.35)" : "rgba(255,255,255,0.08)",
        background: highlight
          ? "linear-gradient(180deg, rgba(197,160,89,0.06), rgba(10,25,47,0.6))"
          : "rgba(255,255,255,0.02)",
        boxShadow: highlight ? "0 30px 80px -40px rgba(197,160,89,0.4)" : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          {icon}{title}
        </div>
        {side && <ChevronRight className={`w-4 h-4 text-muted-foreground ${side === "left" ? "" : "rotate-180"}`} />}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status, resolution }: { status: SyncStatus; resolution?: SyncEntry["resolution"] }) {
  const map: Record<SyncStatus, { label: string; bg: string; fg: string }> = {
    queued:    { label: "queued",   bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.6)" },
    syncing:   { label: "syncing",  bg: "rgba(100,160,255,0.12)", fg: "#9dc4ff" },
    conflict:  { label: "conflict", bg: "rgba(220,80,80,0.15)",   fg: "#ff9b9b" },
    resolved:  { label: resolution === "merged" ? "merged" : "lww", bg: "rgba(197,160,89,0.18)", fg: "var(--gold)" },
    delivered: { label: "pushed",   bg: "rgba(120,200,140,0.15)", fg: "#9be0b0" },
  };
  const s = map[status];
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
