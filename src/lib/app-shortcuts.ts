export interface AppShortcut {
  id: string;
  name: string;
  nameId: string;
  url: string;
  custom?: boolean;
}

// Universal https links: if the native app is installed, the OS hands off
// to it automatically (Android App Links / iOS Universal Links); otherwise
// these just open the mobile web version. This works without any special
// permissions and is the most reliable cross-platform approach.
export const DEFAULT_SHORTCUTS: AppShortcut[] = [
  { id: "whatsapp", name: "WhatsApp", nameId: "WhatsApp", url: "https://wa.me/" },
  { id: "email", name: "Email", nameId: "Email", url: "mailto:" },
  { id: "tiktok", name: "TikTok", nameId: "TikTok", url: "https://www.tiktok.com/" },
  { id: "instagram", name: "Instagram", nameId: "Instagram", url: "https://www.instagram.com/" },
  { id: "facebook", name: "Facebook", nameId: "Facebook", url: "https://www.facebook.com/" },
  { id: "browser", name: "Browser", nameId: "Browser", url: "https://www.google.com/" },
];
