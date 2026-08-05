import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — Noble" }] }),
  component: TermsPage,
});

function TermsPage() {
  const [lang] = useLang();
  return (
    <AppShell title={lang === "id" ? "Syarat & Ketentuan" : "Terms & Conditions"}>
      <div className="prose-sm text-sm leading-relaxed space-y-4 pb-8">
        <p className="text-xs text-muted-foreground">
          {lang === "id" ? "Terakhir diperbarui: 19 Juli 2026" : "Last updated: July 19, 2026"}
        </p>

        {lang === "id" ? (
          <>
            <p>
              Selamat datang di <strong>Noble</strong>, aplikasi asisten pribadi berbasis suara yang dikembangkan
              dan dioperasikan oleh <strong>PT Aurora Master Digital Kreatif</strong> ("kami"). Dengan menggunakan
              Noble, Anda menyetujui syarat dan ketentuan berikut.
            </p>

            <h3 className="font-semibold text-base mt-4">1. Deskripsi Layanan</h3>
            <p>
              Noble adalah aplikasi web (progressive web app) yang membantu Anda mencatat, mengorganisasi, dan
              mengelola aktivitas sehari-hari lewat suara maupun input manual — termasuk Catatan, Tugas, Rapat,
              Janji Temu, Kontak, Diary, Pesan, Rencana Perjalanan, dan Proyek. Sebagian fitur (transkripsi AI,
              penerjemahan, kategorisasi otomatis) memanfaatkan layanan pihak ketiga sebagaimana dijelaskan di
              Kebijakan Privasi.
            </p>

            <h3 className="font-semibold text-base mt-4">2. Akun Pengguna</h3>
            <p>
              Anda bertanggung jawab menjaga kerahasiaan PIN akun Anda. Kami menyimpan PIN dalam bentuk terenkripsi
              (hash) — kami sendiri tidak dapat melihat PIN asli Anda. Kehilangan akses ke device tempat akun
              terdaftar dapat mengakibatkan hilangnya akses ke data Anda, karena sebagian besar data tersimpan
              secara lokal di device tersebut (lihat Kebijakan Privasi).
            </p>

            <h3 className="font-semibold text-base mt-4">3. Uji Coba, Langganan, dan Voucher</h3>
            <p>
              Akun baru mendapat masa uji coba gratis 30 hari dengan akses fitur Premium. Setelah masa uji coba
              berakhir, fitur Premium (termasuk transkripsi AI dan plugin tambahan) memerlukan aktivasi lewat kode
              voucher yang dijual secara resmi oleh kami atau mitra reseller resmi. Kode voucher bersifat sekali
              pakai dan terikat pada email/nomor WhatsApp akun yang mengaktifkannya — tidak dapat dipindahtangankan
              setelah diaktivasi. Kami berhak mengubah struktur harga, durasi, dan fitur paket langganan dari waktu
              ke waktu dengan pemberitahuan yang wajar.
            </p>

            <h3 className="font-semibold text-base mt-4">4. Kepemilikan Konten</h3>
            <p>
              Semua konten yang Anda buat di Noble (catatan, rekaman, foto, dll.) tetap sepenuhnya milik Anda. Kami
              tidak mengklaim kepemilikan atas konten tersebut dan tidak menjual atau membagikannya ke pihak ketiga
              untuk tujuan komersial.
            </p>

            <h3 className="font-semibold text-base mt-4">5. Penggunaan yang Dilarang</h3>
            <p>
              Anda setuju untuk tidak menggunakan Noble untuk aktivitas ilegal, menyebarkan konten yang melanggar
              hukum, mencoba mengakses sistem kami tanpa izin, atau mendistribusikan ulang kode voucher secara
              tidak sah.
            </p>

            <h3 className="font-semibold text-base mt-4">6. Batasan Tanggung Jawab</h3>
            <p>
              Noble disediakan "sebagaimana adanya" tanpa jaminan tersirat apa pun. Kami tidak bertanggung jawab
              atas kehilangan data yang terjadi akibat penghapusan aplikasi, kerusakan perangkat, atau kegagalan
              Anda melakukan pencadangan (backup) data secara berkala. Fitur transkripsi/terjemahan berbasis AI
              dapat menghasilkan kesalahan — selalu periksa kembali hasil sebelum mengandalkannya untuk keputusan
              penting.
            </p>

            <h3 className="font-semibold text-base mt-4">7. Perubahan Layanan & Ketentuan</h3>
            <p>
              Kami dapat mengubah, menambah, atau menghentikan fitur tertentu, serta memperbarui ketentuan ini dari
              waktu ke waktu. Penggunaan berkelanjutan atas Noble setelah perubahan dianggap sebagai persetujuan
              Anda terhadap ketentuan yang diperbarui.
            </p>

            <h3 className="font-semibold text-base mt-4">8. Hukum yang Berlaku</h3>
            <p>Ketentuan ini tunduk pada hukum Republik Indonesia.</p>

            <h3 className="font-semibold text-base mt-4">9. Kontak</h3>
            <p>Pertanyaan seputar ketentuan ini dapat disampaikan ke: auroradreamer888@gmail.com</p>
          </>
        ) : (
          <>
            <p>
              Welcome to <strong>Noble</strong>, a voice-first personal assistant app developed and operated by{" "}
              <strong>PT Aurora Master Digital Kreatif</strong> ("we", "us"). By using Noble, you agree to the
              following terms.
            </p>

            <h3 className="font-semibold text-base mt-4">1. Description of Service</h3>
            <p>
              Noble is a progressive web app that helps you capture, organize, and manage daily activities by
              voice or manual input — including Notes, Tasks, Meetings, Appointments, Contacts, Diary, Messages,
              Trips, and Projects. Some features (AI transcription, translation, automatic categorization) use
              third-party services as described in our Privacy Policy.
            </p>

            <h3 className="font-semibold text-base mt-4">2. User Accounts</h3>
            <p>
              You're responsible for keeping your account PIN confidential. We store your PIN in hashed form only
              — we cannot see your actual PIN. Losing access to the device your account is registered on may mean
              losing access to your data, since most data is stored locally on that device (see Privacy Policy).
            </p>

            <h3 className="font-semibold text-base mt-4">3. Trial, Subscriptions, and Vouchers</h3>
            <p>
              New accounts get a free 30-day trial with Premium access. After the trial ends, Premium features
              (including AI transcription and add-on plugins) require activation via a voucher code sold officially
              by us or authorized resellers. Voucher codes are single-use and bound to the email/WhatsApp number of
              the account that redeems them — they cannot be transferred once activated. We may change subscription
              pricing, duration, and features from time to time with reasonable notice.
            </p>

            <h3 className="font-semibold text-base mt-4">4. Content Ownership</h3>
            <p>
              All content you create in Noble (notes, recordings, photos, etc.) remains fully yours. We claim no
              ownership over it and do not sell or share it with third parties for commercial purposes.
            </p>

            <h3 className="font-semibold text-base mt-4">5. Prohibited Use</h3>
            <p>
              You agree not to use Noble for illegal activity, to distribute unlawful content, to attempt
              unauthorized access to our systems, or to redistribute voucher codes without authorization.
            </p>

            <h3 className="font-semibold text-base mt-4">6. Limitation of Liability</h3>
            <p>
              Noble is provided "as is" without implied warranties. We are not liable for data loss resulting from
              uninstalling the app, device damage, or your failure to back up your data regularly. AI-based
              transcription/translation features can make mistakes — always double-check results before relying
              on them for anything important.
            </p>

            <h3 className="font-semibold text-base mt-4">7. Changes to the Service & Terms</h3>
            <p>
              We may change, add, or discontinue features, and update these terms from time to time. Continued
              use of Noble after changes constitutes acceptance of the updated terms.
            </p>

            <h3 className="font-semibold text-base mt-4">8. Governing Law</h3>
            <p>These terms are governed by the laws of the Republic of Indonesia.</p>

            <h3 className="font-semibold text-base mt-4">9. Contact</h3>
            <p>Questions about these terms can be sent to: auroradreamer888@gmail.com</p>
          </>
        )}
      </div>
    </AppShell>
  );
}
