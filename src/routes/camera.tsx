import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PhotoCaptureFlow } from "@/components/PhotoCaptureFlow";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { usePlugin } from "@/lib/plugins-store";
import { useLang } from "@/lib/settings-store";
import type { ItemType } from "@/lib/db";

const VALID_TYPES: ItemType[] = ["note", "task", "meeting", "appointment", "contact", "message", "diary", "trip", "project"];

export const Route = createFileRoute("/camera")({
  head: () => ({ meta: [{ title: "Camera — Noble" }] }),
  validateSearch: (search: Record<string, unknown>): { type?: ItemType } => ({
    type: VALID_TYPES.includes(search.type as ItemType) ? (search.type as ItemType) : undefined,
  }),
  component: CameraPage,
});

function CameraPage() {
  const [lang] = useLang();
  const enabled = usePlugin("camera");
  const { type: presetType } = Route.useSearch();

  if (!enabled) {
    return (
      <AppShell title={lang === "id" ? "Kamera & Foto" : "Camera & Photos"}>
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-secondary text-muted-foreground">
            <Lock size={24} />
          </div>
          <p className="text-sm font-semibold">
            {lang === "id" ? "Plugin Kamera belum aktif" : "Camera plugin isn't enabled"}
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
    <AppShell title={lang === "id" ? "Kamera & Foto" : "Camera & Photos"}>
      <div className="mb-6">
        <PhotoCaptureFlow presetType={presetType} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {lang === "id" ? "Galeri" : "Gallery"}
      </p>
      <PhotoCarousel />
    </AppShell>
  );
}
