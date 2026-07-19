import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/store/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — AURORA MASTER" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="prose prose-invert max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-3xl" style={{ fontFamily: "var(--font-serif, serif)" }}>Privacy Policy</h1>
      <p className="text-xs text-muted-foreground">
        This page is maintained by AURORA MASTER, DIGITAL & KREATIF ("we", "us") to answer common
        privacy questions about Noble Smart Voice.
      </p>

      <Section title="1. What we collect">
        <p>
          Noble Smart Voice is a <b>local-first</b> application. Your notes, tasks, meetings, contacts,
          reminders, voice recordings, photos, and diary entries are stored on your device using the
          browser's IndexedDB. We do not upload this data to our servers.
        </p>
        <p>
          When you place an order on this storefront, we collect: your name, email, WhatsApp number,
          the plan you chose, and an optional note. This information is used solely to deliver and
          support your order.
        </p>
      </Section>

      <Section title="2. Payment information">
        <p>
          Payments are made via QRIS through Indonesian banks or e-wallets. We do <b>not</b> receive
          your card, wallet, or banking credentials. We only see the resulting transfer confirmation.
        </p>
      </Section>

      <Section title="3. Third-party AI services">
        <p>
          If you enable AI features (auto-categorize, translation, transcription), voice or text
          content is sent to the configured AI provider (Google Gemini via Lovable AI Gateway, or
          local models such as Phi/Gemma/Qwen when available). We do not retain those requests.
        </p>
      </Section>

      <Section title="4. Cookies and analytics">
        <p>
          This storefront uses only local storage to remember your admin session and order drafts.
          We do not use third-party advertising cookies.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p>
          Order records are retained by the store operator for tax, warranty, and support purposes.
          On-device app data lives on your device until you delete it or uninstall the app.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>
          You may request a copy or deletion of your order record at any time by contacting us at the
          WhatsApp number listed on your receipt.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          AURORA MASTER, DIGITAL & KREATIF · NMID ID1026535963593. Contact via the WhatsApp number
          used at checkout, or reply to the message we send with your serial.
        </p>
      </Section>

      <p className="text-xs text-muted-foreground mt-8">
        This policy is provided as informational content and is not legal advice. It is not a
        certification. Please review with local counsel where required.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}
