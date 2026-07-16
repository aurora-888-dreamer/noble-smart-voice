import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Bell, Globe } from "lucide-react";
import { markOnboarded, setStoredLang } from "@/lib/settings-store";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { requestNotifPermission } from "@/lib/reminders";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const [lang, setLang] = useState<Lang>("en");
  const nav = useNavigate();

  async function start() {
    setStoredLang(lang);
    try {
      await navigator.mediaDevices?.getUserMedia({ audio: true }).then((s) => {
        s.getTracks().forEach((t) => t.stop());
      });
    } catch {
      /* ignore */
    }
    await requestNotifPermission();
    markOnboarded();
    nav({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-md px-6 py-12 flex flex-col min-h-dvh">
        <div className="flex-1 flex flex-col justify-center">
          <img
            src="/icon-512.png"
            alt="Noble"
            width={80}
            height={80}
            className="rounded-2xl shadow-lg mb-6"
          />
          <h1 className="text-3xl font-bold mb-2">{t(lang, "onboardWelcome")}</h1>
          <p className="text-muted-foreground mb-8">{t(lang, "onboardBody")}</p>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-primary" />
              <span className="text-sm font-semibold">{t(lang, "pickLanguage")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["en", "id"] as const).map((L) => (
                <button
                  key={L}
                  onClick={() => setLang(L)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    lang === L
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="text-sm font-semibold">
                    {L === "en" ? "English" : "Bahasa Indonesia"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {L === "en" ? "Save note: buy milk" : "Simpan catatan: beli susu"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-3 mb-8 text-sm">
            <li className="flex items-center gap-3 text-muted-foreground">
              <Mic size={16} className="text-primary" /> {t(lang, "onboardMic")}
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <Bell size={16} className="text-primary" /> {t(lang, "onboardNotif")}
            </li>
          </ul>
        </div>

        <button
          onClick={start}
          className="w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          {t(lang, "onboardStart")}
        </button>
      </div>
    </div>
  );
}