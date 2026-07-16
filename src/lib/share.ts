// Cross-platform share helpers. WhatsApp / email / call use canonical URL
// schemes; print falls back to the browser print dialog (which offers
// "Save as PDF" everywhere).

export function shareToWhatsApp(text: string, phone?: string) {
  const encoded = encodeURIComponent(text);
  const url = phone
    ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function shareToEmail(subject: string, body: string, to?: string) {
  const url = `mailto:${to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

export function makeCall(phone: string) {
  window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function printItem(title: string, body: string) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${escape(title)}</title>
    <style>
      body{font-family:'Cormorant Garamond',Georgia,serif;padding:48px;max-width:640px;margin:auto;color:#0A192F;}
      h1{font-size:28px;border-bottom:2px solid #C9A961;padding-bottom:8px;margin-bottom:16px;}
      pre{white-space:pre-wrap;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;}
      footer{margin-top:48px;color:#888;font-size:11px;text-align:center;}
    </style></head><body>
    <h1>${escape(title)}</h1>
    <pre>${escape(body)}</pre>
    <footer>Noble — printed ${new Date().toLocaleString()}</footer>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
