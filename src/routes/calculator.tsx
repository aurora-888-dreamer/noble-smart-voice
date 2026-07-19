import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CalculatorWidget } from "@/components/CalculatorWidget";
import { usePlugin } from "@/lib/plugins-store";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/calculator")({
  head: () => ({ meta: [{ title: "Calculator — Noble" }] }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const [lang] = useLang();
  const enabled = usePlugin("calculator");

  if (!enabled) {
    return (
      <AppShell title={lang === "id" ? "Kalkulator" : "Calculator"}>
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-secondary text-muted-foreground">
            <Lock size={24} />
          </div>
          <p className="text-sm font-semibold">
            {lang === "id" ? "Plugin Kalkulator belum aktif" : "Calculator plugin isn't enabled"}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {lang === "id"
              ? "Fitur ini bagian dari plugin tambahan Noble. Hubungi admin untuk mengaktifkannya."
              : "This feature is part of a Noble add-on plugin. Contact the admin to enable it."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={lang === "id" ? "Kalkulator" : "Calculator"}>
      <CalculatorWidget />
    </AppShell>
  );
}
