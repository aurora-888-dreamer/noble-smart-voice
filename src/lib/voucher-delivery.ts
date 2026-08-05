// Builds a WhatsApp (wa.me) or mailto deep link so the admin can actually
// deliver a voucher code to the customer's WhatsApp number or email address,
// instead of only recording a "delivered to" value with nothing sent.

export type ContactChannel = "whatsapp" | "email";

export function detectChannel(value: string): ContactChannel | null {
  const v = value.trim();
  if (!v) return null;
  return v.includes("@") ? "email" : "whatsapp";
}

// Converts a loosely-formatted Indonesian phone number into the digits-only,
// country-code-prefixed form wa.me requires (e.g. "0812-3456-7890" -> "6281234567890").
export function toWhatsAppNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

export function voucherMessage(code: string, plan: "monthly" | "yearly", name?: string) {
  const planLabel = plan === "yearly" ? "1 Year" : "30 Days";
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `${greeting} here is your Magic Talk voucher code: ${code} (${planLabel} plan). Enter it under "Have a voucher code?" in the app to activate. Thank you!`;
}

// Credit vouchers use the same redemption box in the app, but the wording must
// say "credits", not "days" — reusing the plan-voucher message would wrongly
// imply a subscription was granted instead of AI-usage credits.
export function creditVoucherMessage(code: string, credits: number, name?: string) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `${greeting} here is your Magic Talk credit voucher code: ${code} (+${credits} credits). Enter it under "Have a voucher code?" in the app to add the credits to your balance. Thank you!`;
}

export function creditVoucherDeliveryUrl(
  to: string,
  code: string,
  credits: number,
  name?: string,
): { url: string; channel: ContactChannel } | null {
  const channel = detectChannel(to);
  if (!channel) return null;
  const text = creditVoucherMessage(code, credits, name);
  if (channel === "email") {
    return {
      channel,
      url: `mailto:${to.trim()}?subject=${encodeURIComponent("Your Magic Talk credit voucher")}&body=${encodeURIComponent(text)}`,
    };
  }
  return { channel, url: `https://wa.me/${toWhatsAppNumber(to)}?text=${encodeURIComponent(text)}` };
}

// Returns a URL the admin UI can open in a new tab to actually send the voucher.
export function voucherDeliveryUrl(
  to: string,
  code: string,
  plan: "monthly" | "yearly",
  name?: string,
): { url: string; channel: ContactChannel } | null {
  const channel = detectChannel(to);
  if (!channel) return null;
  const text = voucherMessage(code, plan, name);
  if (channel === "email") {
    return {
      channel,
      url: `mailto:${to.trim()}?subject=${encodeURIComponent("Your Magic Talk voucher code")}&body=${encodeURIComponent(text)}`,
    };
  }
  return { channel, url: `https://wa.me/${toWhatsAppNumber(to)}?text=${encodeURIComponent(text)}` };
}
