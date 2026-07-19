import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/store/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — AURORA MASTER" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-3xl" style={{ fontFamily: "var(--font-serif, serif)" }}>Terms & Conditions</h1>
      <p className="text-xs text-muted-foreground">
        These terms govern the purchase and use of Noble Smart Voice licenses sold by
        AURORA MASTER, DIGITAL & KREATIF.
      </p>

      <Section title="1. License">
        A license grants a single person the right to activate and use Noble Smart Voice for the
        duration of the chosen plan (monthly, quarterly, yearly, or lifetime). The serial number
        issued to you is bound to your name, email, and WhatsApp on file.
      </Section>
      <Section title="2. Delivery">
        Serial numbers are issued after we confirm your QRIS payment, typically within business
        hours (WIB). Delivery is via WhatsApp or email.
      </Section>
      <Section title="3. Refunds">
        Because a serial is a digital good that unlocks premium features immediately upon
        activation, all sales are final once your serial has been activated. Before activation you
        may request a full refund within 7 days.
      </Section>
      <Section title="4. Acceptable use">
        You agree not to redistribute, resell, or share your serial with third parties. Sharing a
        serial across multiple identities may result in it being revoked without refund.
      </Section>
      <Section title="5. Renewals">
        Subscription plans (monthly/quarterly/yearly) do not auto-renew. When your period expires,
        the app returns to Standard until you purchase a new serial.
      </Section>
      <Section title="6. Warranty">
        The software is provided "as is", without warranty of any kind. We do our best to keep it
        working across platforms, but do not guarantee compatibility with every device.
      </Section>
      <Section title="7. Liability">
        AURORA MASTER's total liability is limited to the amount you paid for the current license.
        We are not liable for data loss on your device — please back up regularly using the built-in
        export tools.
      </Section>
      <Section title="8. Changes">
        We may update these terms; the version in effect at the time of your purchase applies to
        that order.
      </Section>
      <Section title="9. Contact">
        AURORA MASTER, DIGITAL & KREATIF · NMID ID1026535963593.
      </Section>

      <p className="text-xs text-muted-foreground mt-8">
        This document is informational content maintained by the store operator, not legal advice.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </section>
  );
}
