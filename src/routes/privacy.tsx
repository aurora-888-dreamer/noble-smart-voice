import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Noble" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const [lang] = useLang();
  return (
    <AppShell title={lang === "id" ? "Kebijakan Privasi" : "Privacy Policy"}>
      <div className="prose-sm text-sm leading-relaxed space-y-4 pb-8">
        <p className="text-xs text-muted-foreground">
          {lang === "id" ? "Terakhir diperbarui: 19 Juli 2026" : "Last updated: July 19, 2026"}
        </p>

        {lang === "id" ? (
          <>
            <p>
              Kebijakan ini menjelaskan data apa yang dikumpulkan Noble, bagaimana data itu disimpan, dan dengan
              siapa data itu mungkin dibagikan. Noble dioperasikan oleh <strong>PT Aurora Master Digital Kreatif</strong>.
            </p>

            <h3 className="font-semibold text-base mt-4">1. Prinsip Utama: Local-First</h3>
            <p>
              Sebagian besar data Anda — Catatan, Tugas, Rapat, Janji, Kontak, Diary, Pesan, Rencana Perjalanan,
              Proyek, dan foto — <strong>tersimpan langsung di perangkat Anda</strong> (di dalam penyimpanan browser,
              bukan di server kami). Kami tidak memiliki salinan data ini di server kecuali Anda secara eksplisit
              mengaktifkan fitur yang membutuhkan server (dijelaskan di bawah).
            </p>

            <h3 className="font-semibold text-base mt-4">2. Data yang Kami Kumpulkan</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Saat registrasi: nama, email, dan/atau nomor WhatsApp yang Anda berikan sendiri.</li>
              <li>PIN akun Anda — disimpan dalam bentuk hash (terenkripsi satu arah), bukan teks asli.</li>
              <li>
                Konten yang Anda buat (rekaman suara yang sudah ditranskrip jadi teks, foto, video, catatan) —
                tersimpan lokal seperti dijelaskan di atas.
              </li>
              <li>Kode voucher yang Anda aktivasi, dan status lisensi/langganan akun Anda (lihat poin 4).</li>
            </ul>

            <h3 className="font-semibold text-base mt-4">3. Pemrosesan oleh AI Pihak Ketiga (Google)</h3>
            <p>
              Fitur Premium seperti transkripsi audio, penerjemahan, dan kategorisasi otomatis mengirim teks/audio
              yang relevan ke <strong>Google (Gemini API)</strong> untuk diproses, lalu hasilnya dikirim kembali ke
              perangkat Anda dan disimpan lokal. Kami tidak menyimpan salinan permanen dari data yang dikirim ke
              Google di server kami sendiri. Penggunaan data oleh Google tunduk pada kebijakan privasi Google
              sendiri.
            </p>

            <h3 className="font-semibold text-base mt-4">4. Backend Voucher/Lisensi</h3>
            <p>
              Untuk mengaktifkan kode voucher, aplikasi mengirim kode tersebut beserta email/nomor WhatsApp akun
              Anda ke server kami (di-hosting lewat Supabase) untuk diverifikasi. Server ini hanya menyimpan: kode
              voucher, status (sudah/belum dipakai), tier langganan, dan kontak yang mengaktivasi — <strong>tidak
              pernah</strong> menyimpan Catatan, Tugas, foto, atau konten pribadi lain Anda.
            </p>

            <h3 className="font-semibold text-base mt-4">5. Sinkronisasi Antar Perangkat</h3>
            <p>
              Fitur Sinkronisasi mengirim data langsung dari satu perangkat Anda ke perangkat Anda yang lain lewat
              koneksi peer-to-peer (WebRTC) — data tidak pernah singgah atau tersimpan di server kami selama proses
              ini.
            </p>

            <h3 className="font-semibold text-base mt-4">6. Berbagi dengan Pihak Ketiga</h3>
            <p>
              Kami <strong>tidak menjual</strong> data Anda kepada pihak mana pun. Data hanya diproses oleh
              penyedia layanan yang disebut di atas (Google untuk AI, Supabase untuk verifikasi voucher) sebatas
              yang diperlukan untuk fitur yang Anda aktifkan sendiri.
            </p>

            <h3 className="font-semibold text-base mt-4">7. Keamanan</h3>
            <p>
              Karena sebagian besar data tersimpan lokal di perangkat Anda, keamanan data Anda juga bergantung pada
              keamanan perangkat itu sendiri (kunci layar, izin aplikasi, dll.). Kami sarankan mengaktifkan kunci
              layar perangkat dan melakukan Backup secara berkala.
            </p>

            <h3 className="font-semibold text-base mt-4">8. Hak Anda</h3>
            <p>
              Anda dapat mengekspor seluruh data Anda kapan saja lewat fitur Backup, dan menghapus data lewat
              masing-masing halaman kategori. Karena data tersimpan lokal, menghapus/uninstall aplikasi dari
              perangkat juga menghapus data tersebut secara permanen (kecuali sudah di-backup).
            </p>

            <h3 className="font-semibold text-base mt-4">9. Anak-anak</h3>
            <p>
              Noble tidak ditujukan untuk digunakan oleh anak di bawah 13 tahun tanpa pengawasan orang tua/wali.
            </p>

            <h3 className="font-semibold text-base mt-4">10. Perubahan Kebijakan</h3>
            <p>Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Perubahan signifikan akan diinformasikan di dalam aplikasi.</p>

            <h3 className="font-semibold text-base mt-4">11. Kontak</h3>
            <p>Pertanyaan seputar privasi dapat disampaikan ke: auroradreamer888@gmail.com</p>
          </>
        ) : (
          <>
            <p>
              This policy explains what data Noble collects, how it's stored, and who it may be shared with.
              Noble is operated by <strong>PT Aurora Master Digital Kreatif</strong>.
            </p>

            <h3 className="font-semibold text-base mt-4">1. Core Principle: Local-First</h3>
            <p>
              Most of your data — Notes, Tasks, Meetings, Appointments, Contacts, Diary, Messages, Trips, Projects,
              and photos — <strong>is stored directly on your device</strong> (in browser storage, not on our
              servers). We hold no server-side copy of this data unless you explicitly enable a feature that
              requires one (described below).
            </p>

            <h3 className="font-semibold text-base mt-4">2. Data We Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>At registration: the name, email, and/or WhatsApp number you provide yourself.</li>
              <li>Your account PIN — stored as a one-way hash, never in plain text.</li>
              <li>Content you create (voice recordings once transcribed to text, photos, videos, notes) — stored locally as above.</li>
              <li>Voucher codes you activate, and your account's license/subscription status (see section 4).</li>
            </ul>

            <h3 className="font-semibold text-base mt-4">3. Processing by Third-Party AI (Google)</h3>
            <p>
              Premium features like audio transcription, translation, and automatic categorization send the
              relevant text/audio to <strong>Google (Gemini API)</strong> for processing, and the result is sent
              back to your device and stored locally. We keep no permanent copy of data sent to Google on our own
              servers. Google's own privacy policy governs its use of that data.
            </p>

            <h3 className="font-semibold text-base mt-4">4. Voucher/License Backend</h3>
            <p>
              To activate a voucher code, the app sends that code along with your account's email/WhatsApp number
              to our server (hosted via Supabase) for verification. This server only stores: the voucher code, its
              status (used/unused), subscription tier, and the contact that redeemed it — it{" "}
              <strong>never</strong> stores your Notes, Tasks, photos, or other personal content.
            </p>

            <h3 className="font-semibold text-base mt-4">5. Cross-Device Sync</h3>
            <p>
              The Sync feature sends data directly from one of your devices to another over a peer-to-peer
              (WebRTC) connection — data never passes through or is stored on our servers during this process.
            </p>

            <h3 className="font-semibold text-base mt-4">6. Sharing with Third Parties</h3>
            <p>
              We do <strong>not sell</strong> your data to anyone. Data is only processed by the providers named
              above (Google for AI, Supabase for voucher verification), limited to what's needed for the features
              you've chosen to enable.
            </p>

            <h3 className="font-semibold text-base mt-4">7. Security</h3>
            <p>
              Since most of your data lives locally on your device, its security also depends on your device's own
              security (screen lock, app permissions, etc.). We recommend enabling a device screen lock and backing
              up regularly.
            </p>

            <h3 className="font-semibold text-base mt-4">8. Your Rights</h3>
            <p>
              You can export all your data at any time via the Backup feature, and delete data from each category
              page. Because data is stored locally, deleting/uninstalling the app from your device also permanently
              deletes that data (unless already backed up).
            </p>

            <h3 className="font-semibold text-base mt-4">9. Children</h3>
            <p>Noble is not intended for use by children under 13 without parental/guardian supervision.</p>

            <h3 className="font-semibold text-base mt-4">10. Changes to This Policy</h3>
            <p>We may update this policy from time to time. Significant changes will be announced within the app.</p>

            <h3 className="font-semibold text-base mt-4">11. Contact</h3>
            <p>Privacy questions can be sent to: auroradreamer888@gmail.com</p>
          </>
        )}
      </div>
    </AppShell>
  );
}
