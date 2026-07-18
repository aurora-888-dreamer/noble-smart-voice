import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useLang, useWakePhrase } from "@/lib/settings-store";

export const Route = createFileRoute("/guide")({
  head: () => ({ meta: [{ title: "User Guide — Noble" }] }),
  component: GuidePage,
});

function GuidePage() {
  const [lang] = useLang();
  const [wake] = useWakePhrase();
  return (
    <AppShell title={lang === "id" ? "Panduan" : "User Guide"}>
      <article className="prose prose-invert max-w-none space-y-6 pb-8">
        <section>
          <h2
            className="text-2xl mb-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {lang === "id" ? "Selamat datang di Noble" : "Welcome to Noble"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {lang === "id"
              ? "Noble adalah asisten suara pribadi Anda. Bicara — Noble akan menyimpan, mengingat, dan mengingatkan."
              : "Noble is your private voice assistant. Speak — Noble saves, remembers, and reminds."}
          </p>
        </section>

        <Step
          n={1}
          title={lang === "id" ? "Bangunkan Noble" : "Wake Noble"}
          body={
            lang === "id"
              ? `Ucapkan "${wake}" (default: Aurora Start) atau ketuk tombol mikrofon.`
              : `Say "${wake}" (default: Aurora Start) or tap the mic button.`
          }
        />
        <Step
          n={2}
          title={lang === "id" ? "Perintah singkat (Bahasa Inggris/Indonesia)" : "Short commands (English/Indonesian)"}
          body={
            lang === "id"
              ? "Ucapkan perintah setelah mic aktif menunggu (bisa Inggris atau Indonesia):"
              : "Say a command once the mic is listening (English or Indonesian both work):"
          }
        >
          <ul className="text-sm mt-2 space-y-1 text-muted-foreground list-disc pl-5">
            <li><b>go record</b> / <b>rekam</b> / <b>buka rekam</b> — {lang === "id" ? "buka halaman perekaman untuk mencatat sesuatu" : "opens the recording page to capture something"}</li>
            <li><b>close mic</b> / <b>standby</b> / <b>tutup mic</b> — {lang === "id" ? "hentikan mikrofon" : "stop listening"}</li>
            <li><b>open calendar / tasks / notes / diary / contacts / trips</b> {lang === "id" ? "(atau versi Indonesianya: buka kalender / tugas / catatan / diary / kontak / perjalanan)" : ""}</li>
            <li><b>call [name]</b> / <b>telepon [nama]</b> — {lang === "id" ? "telepon kontak" : "call a contact"}</li>
            <li><b>backup</b> / <b>cadangkan</b> — {lang === "id" ? "ekspor data" : "export data"}</li>
            <li><b>sign out</b> / <b>keluar</b></li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            {lang === "id"
              ? "Kalau perintah suara tidak terdeteksi (pengenalan suara kadang meleset), ketuk tautan \"Buka Record manual\" yang muncul di bawah indikator mendengarkan."
              : "If a voice command isn't recognized (speech recognition can occasionally mishear), tap the \"Open Record manually\" link that appears under the listening indicator."}
          </p>
        </Step>
        <Step
          n={3}
          title={lang === "id" ? "Merekam & menyimpan" : "Recording & saving"}
          body={
            lang === "id"
              ? "Di halaman Record, semua yang Anda ucapkan tercatat langsung sebagai teks di kotak, sampai Anda ketuk Selesai (atau diam melewati batas waktu di Pengaturan). Lalu pilih kategorinya (Catatan, Tugas, Rapat, Janji, Kontak, Pesan, atau Diary) — Noble akan otomatis mendeteksi judul dan tanggal/waktu, dan Anda masih bisa mengedit sebelum menyimpan."
              : "On the Record page, everything you say is printed live into the text box until you tap Done (or stay silent past the timeout set in Settings). Then pick a category (Note, Task, Meeting, Appointment, Contact, Message, or Diary) — Noble auto-detects the title and date/time, and you can still edit before saving."
          }
        />
        <Step
          n={4}
          title={lang === "id" ? "Kalender & pengingat" : "Calendar & reminders"}
          body={
            lang === "id"
              ? "Semua item dengan tanggal muncul di Kalender. Notifikasi berbunyi seperti alarm ketika waktunya tiba."
              : "Every dated item shows on the Calendar. Notifications ring like an alarm when the time arrives."
          }
        />
        <Step
          n={5}
          title={lang === "id" ? "Bagikan & cetak" : "Share & print"}
          body={
            lang === "id"
              ? "Setiap item bisa dibagi via WhatsApp, Email, atau dicetak / disimpan sebagai PDF."
              : "Every item can be shared via WhatsApp, Email, or printed / saved as PDF."
          }
        />
        <Step
          n={6}
          title={lang === "id" ? "Cadangan & transfer" : "Backup & transfer"}
          body={
            lang === "id"
              ? "Di Pengaturan → Ekspor data akan menyimpan file JSON ke Laptop / Drive / penyimpanan pilihan Anda."
              : "Settings → Export data downloads a JSON file you can put on Laptop / Drive / any storage."
          }
        />
        <Step
          n={7}
          title={lang === "id" ? "Biometrik & PIN" : "Biometrics & PIN"}
          body={
            lang === "id"
              ? "Daftarkan sidik jari / Face ID di Pengaturan. Anda tetap bisa masuk memakai PIN 6 digit kapan saja."
              : "Register fingerprint / Face ID in Settings. You can always fall back to the 6-digit PIN."
          }
        />
        <Step
          n={8}
          title={lang === "id" ? "AI kategori otomatis" : "AI auto-category"}
          body={
            lang === "id"
              ? "Model AI Noble (Gemini + fallback lokal) mengelompokkan catatan Anda ke work/family/health/finance secara otomatis."
              : "Noble's AI (Gemini with local fallback) tags every capture into work / family / health / finance automatically."
          }
        />
      </article>
    </AppShell>
  );
}

function Step({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-baseline gap-3">
        <span
          className="text-primary font-semibold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {String(n).padStart(2, "0")}
        </span>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{body}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
