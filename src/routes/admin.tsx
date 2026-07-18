import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ToggleLeft, ToggleRight } from "lucide-react";
import { getProfile, useLicenseInfo, setPremiumTestOverride } from "@/lib/auth-store";
import { PLUGIN_REGISTRY } from "@/lib/plugins";
import { usePluginState, setPluginEnabled } from "@/lib/plugins-store";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [lang] = useLang();
  const [ready, setReady] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const license = useLicenseInfo();
  const plugins = usePluginState();

  useEffect(() => {
    const owner = !!getProfile()?.isAdmin || license.code === "NOBLE440077";
    setIsOwner(owner);
    setReady(true);
  }, [license.code]);

  if (!ready) return null;

  // Deliberately not a friendly "access denied" page — this route isn't
  // linked anywhere, so anyone landing here without owner access just sees
  // nothing useful, not a hint that an admin area exists.
  if (!isOwner) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background text-foreground p-6">
        <Link to="/" className="text-sm text-muted-foreground underline">
          {lang === "id" ? "Kembali ke Home" : "Back to Home"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6 pt-4">
        <ShieldAlert size={18} className="text-primary" />
        <h1 className="text-lg font-semibold">Admin — Noble</h1>
      </div>

      <section className="rounded-2xl bg-card border border-border p-4 mb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {lang === "id" ? "Status Lisensi (akun ini)" : "License status (this account)"}
        </p>
        <p className="text-sm">
          {license.hasLicense
            ? `${license.source} · ${license.tier} · ${license.daysLeft == null ? (lang === "id" ? "tanpa batas" : "unlimited") : `${license.daysLeft} ${lang === "id" ? "hari lagi" : "days left"}`}`
            : lang === "id" ? "Tidak ada lisensi aktif" : "No active license"}
          {license.manuallyOff && (lang === "id" ? " (dinonaktifkan sementara)" : " (temporarily off)")}
        </p>
        <button
          onClick={() => setPremiumTestOverride(!license.manuallyOff)}
          className="mt-3 rounded-xl border border-border px-4 py-2 text-xs font-semibold"
        >
          {license.manuallyOff
            ? lang === "id" ? "Aktifkan Premium lagi" : "Turn Premium back on"
            : lang === "id" ? "Nonaktifkan sementara (uji Standard)" : "Switch off (test Standard)"}
        </button>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
          {lang === "id" ? "Plugin (uji on/off)" : "Plugins (test toggle)"}
        </p>
        <ul className="space-y-3">
          {PLUGIN_REGISTRY.map((p) => {
            const enabled = !!plugins[p.id];
            return (
              <li key={p.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{lang === "id" ? p.nameId : p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === "id" ? p.descriptionId : p.description}
                  </p>
                </div>
                <button
                  onClick={() => setPluginEnabled(p.id, !enabled)}
                  className="shrink-0 mt-0.5"
                  aria-label={`Toggle ${p.id}`}
                >
                  {enabled ? (
                    <ToggleRight size={28} className="text-primary" />
                  ) : (
                    <ToggleLeft size={28} className="text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Link to="/settings" className="block text-center text-xs text-muted-foreground underline mt-6">
        {lang === "id" ? "Kembali ke Settings" : "Back to Settings"}
      </Link>
    </div>
  );
}
