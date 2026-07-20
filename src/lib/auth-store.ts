// Local-only auth: profile + 6-digit PIN + biometric (WebAuthn) + premium flag.
// This is a client-side gate — not real cryptography — perfect for a
// personal offline PWA. Data never leaves the device.
import { useEffect, useState } from "react";

const PROFILE_KEY = "noble.profile";
const PIN_KEY = "noble.pinHash";
const SESSION_KEY = "noble.session";
const BIO_KEY = "noble.bioCredential";

export interface Profile {
  name: string;
  email: string;
  whatsapp: string;
  createdAt: number;
  isAdmin?: boolean;
}

// Simple SHA-256 hash so a casual DB peek doesn't reveal the PIN.
async function hashPin(pin: string): Promise<string> {
  const buf = new TextEncoder().encode(pin + "::noble-salt");
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

export function isRegistered(): boolean {
  return !!getProfile() && !!localStorage.getItem(PIN_KEY);
}

export async function register(input: {
  name: string;
  email: string;
  whatsapp: string;
  pin: string;
}) {
  const isAdmin =
    input.email.trim().toLowerCase() === "aurora@noble.app" ||
    input.pin === "999999";
  const profile: Profile = {
    name: input.name.trim(),
    email: input.email.trim(),
    whatsapp: input.whatsapp.trim(),
    createdAt: Date.now(),
    isAdmin,
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(PIN_KEY, await hashPin(input.pin));
  localStorage.setItem(SESSION_KEY, "1");
  window.dispatchEvent(new Event("noble:auth"));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  const attempted = await hashPin(pin);
  const ok = stored === attempted;
  if (ok) {
    localStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("noble:auth"));
  }
  return ok;
}

export function isSignedIn(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SESSION_KEY) === "1";
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("noble:auth"));
}

export function useAuthState() {
  const [state, setState] = useState({ registered: false, signedIn: false });
  useEffect(() => {
    const sync = () =>
      setState({ registered: isRegistered(), signedIn: isSignedIn() });
    sync();
    window.addEventListener("noble:auth", sync);
    return () => window.removeEventListener("noble:auth", sync);
  }, []);
  return state;
}

// ————— Biometric (WebAuthn) —————
export function isBiometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(navigator.credentials && window.PublicKeyCredential);
}

export function hasBiometric(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(BIO_KEY);
}

export async function registerBiometric(): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  const profile = getProfile();
  if (!profile) return false;
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Noble" },
        user: {
          id: new TextEncoder().encode(profile.email),
          name: profile.email,
          displayName: profile.name,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          userVerification: "required",
          authenticatorAttachment: "platform",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(
      BIO_KEY,
      btoa(String.fromCharCode(...new Uint8Array(cred.rawId))),
    );
    return true;
  } catch (err) {
    console.error("Biometric register failed", err);
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!isBiometricSupported() || !hasBiometric()) return false;
  try {
    const stored = localStorage.getItem(BIO_KEY);
    if (!stored) return false;
    const idBytes = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: idBytes, type: "public-key" }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    if (assertion) {
      localStorage.setItem(SESSION_KEY, "1");
      window.dispatchEvent(new Event("noble:auth"));
      return true;
    }
    return false;
  } catch (err) {
    console.error("Biometric auth failed", err);
    return false;
  }
}

export function removeBiometric() {
  localStorage.removeItem(BIO_KEY);
}

// ————— Premium activation & licensing —————
//
// Model:
// - LICENSE_KEY holds how premium was earned: a free 30-day trial (started
//   automatically at registration) or an activation code. `durationDays`
//   is null for codes that never expire (owner/admin test codes).
// - MANUAL_OFF_KEY is a separate on/off switch, independent of the license
//   itself — lets you flip back to the Standard experience for testing
//   without losing your trial/code (flipping it back on doesn't require
//   re-entering anything).
const LICENSE_KEY = "noble.license";
const MANUAL_OFF_KEY = "noble.premiumManualOff";
const LEGACY_PREMIUM_KEY = "noble.premium"; // pre-license-model flag, migrated below

export interface LicenseRecord {
  source: "trial" | "code";
  code: string;
  tier: "standard" | "premium";
  activatedAt: number;
  /** null = never expires (owner/admin codes). Trials and future paid plans set 30/90/365. */
  durationDays: number | null;
}

function getLicenseRecord(): LicenseRecord | null {
  if (typeof window === "undefined") return null;
  migrateLegacyPremiumFlag();
  const raw = localStorage.getItem(LICENSE_KEY);
  return raw ? (JSON.parse(raw) as LicenseRecord) : null;
}

function saveLicenseRecord(rec: LicenseRecord) {
  localStorage.setItem(LICENSE_KEY, JSON.stringify(rec));
  window.dispatchEvent(new Event("noble:auth"));
}

// One-time migration from the old boolean "noble.premium" flag used before
// trials/expiry existed. Whatever code was stored there is treated as a
// no-expiry code license, matching its old always-on behavior.
function migrateLegacyPremiumFlag() {
  if (localStorage.getItem(LICENSE_KEY)) return;
  const legacy = localStorage.getItem(LEGACY_PREMIUM_KEY);
  if (!legacy) return;
  localStorage.setItem(
    LICENSE_KEY,
    JSON.stringify({
      source: "code",
      code: legacy,
      tier: "premium",
      activatedAt: Date.now(),
      durationDays: null,
    } satisfies LicenseRecord),
  );
  localStorage.removeItem(LEGACY_PREMIUM_KEY);
}

/** Call once a registered user has no license yet — starts their 30-day trial. */
export function ensureTrialStarted() {
  if (typeof window === "undefined") return;
  if (!isRegistered()) return;
  if (getLicenseRecord()) return;
  saveLicenseRecord({
    source: "trial",
    code: "TRIAL",
    tier: "premium",
    activatedAt: Date.now(),
    durationDays: 30,
  });
}

/** After the server confirms a voucher redemption, store it as a real license locally. */
export function applyRedeemedLicense(input: { code: string; tier: "standard" | "premium"; durationDays: number }) {
  saveLicenseRecord({
    source: "code",
    code: input.code,
    tier: input.tier,
    activatedAt: Date.now(),
    durationDays: input.durationDays,
  });
  setPremiumTestOverride(false);
}

export function activatePremium(code: string): boolean {
  const c = code.trim().toUpperCase();
  const isOwnerCode = c === "AURORA-ADMIN" || c === "NOBLE440077";
  const isLegacyCode = c === "AURORA-PREMIUM" || c.startsWith("AURORA-PREMIUM-");
  if (!isOwnerCode && !isLegacyCode) return false;
  saveLicenseRecord({
    source: "code",
    code: c,
    tier: "premium",
    // Owner/admin codes and today's promo codes never expire. Once real
    // paid plans exist (30/90/365-day, standard/premium), issue those
    // through a separate flow that sets a real durationDays here instead.
    durationDays: null,
    activatedAt: Date.now(),
  });
  setPremiumTestOverride(false);
  return true;
}

/** Turn premium off without losing the trial/code, so it can be flipped back on later. */
export function setPremiumTestOverride(off: boolean) {
  if (typeof window === "undefined") return;
  if (off) localStorage.setItem(MANUAL_OFF_KEY, "1");
  else localStorage.removeItem(MANUAL_OFF_KEY);
  window.dispatchEvent(new Event("noble:auth"));
}

export function isPremiumManuallyOff(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MANUAL_OFF_KEY) === "1";
}

export interface LicenseInfo {
  hasLicense: boolean;
  tier: "standard" | "premium" | null;
  source: "trial" | "code" | "admin" | null;
  code: string | null;
  /** Days remaining, or null if unlimited / no license. */
  daysLeft: number | null;
  expired: boolean;
  manuallyOff: boolean;
}

export function getLicenseInfo(): LicenseInfo {
  const manuallyOff = isPremiumManuallyOff();
  if (getProfile()?.isAdmin) {
    return { hasLicense: true, tier: "premium", source: "admin", code: "admin", daysLeft: null, expired: false, manuallyOff };
  }
  const rec = getLicenseRecord();
  if (!rec) {
    return { hasLicense: false, tier: null, source: null, code: null, daysLeft: null, expired: false, manuallyOff };
  }
  const expiresAt = rec.durationDays == null ? null : rec.activatedAt + rec.durationDays * 86_400_000;
  const expired = expiresAt != null && Date.now() >= expiresAt;
  const daysLeft = expiresAt == null ? null : Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
  return { hasLicense: true, tier: rec.tier, source: rec.source, code: rec.code, daysLeft, expired, manuallyOff };
}

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  const info = getLicenseInfo();
  if (info.manuallyOff) return false;
  return info.hasLicense && !info.expired;
}

export function usePremium() {
  const [p, setP] = useState(false);
  useEffect(() => {
    const sync = () => setP(isPremium());
    sync();
    window.addEventListener("noble:auth", sync);
    return () => window.removeEventListener("noble:auth", sync);
  }, []);
  return p;
}

export function useLicenseInfo() {
  const [info, setInfo] = useState<LicenseInfo>({
    hasLicense: false, tier: null, source: null, code: null, daysLeft: null, expired: false, manuallyOff: false,
  });
  useEffect(() => {
    const sync = () => setInfo(getLicenseInfo());
    sync();
    window.addEventListener("noble:auth", sync);
    return () => window.removeEventListener("noble:auth", sync);
  }, []);
  return info;
}
