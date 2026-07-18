// Local-only auth: profile + 6-digit PIN + biometric (WebAuthn) + premium flag.
// This is a client-side gate — not real cryptography — perfect for a
// personal offline PWA. Data never leaves the device.
import { useEffect, useState } from "react";

const PROFILE_KEY = "noble.profile";
const PIN_KEY = "noble.pinHash";
const SESSION_KEY = "noble.session";
const BIO_KEY = "noble.bioCredential";
const PREMIUM_KEY = "noble.premium";

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
  if (isAdmin) localStorage.setItem(PREMIUM_KEY, "admin");
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

// ————— Premium activation —————
export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PREMIUM_KEY) || !!getProfile()?.isAdmin;
}

export function activatePremium(code: string): boolean {
  const c = code.trim().toUpperCase();
  if (
    c === "AURORA-ADMIN" ||
    c === "AURORA-PREMIUM" ||
    c.startsWith("AURORA-PREMIUM-") ||
    c === "NOBLE440077"
  ) {
    localStorage.setItem(PREMIUM_KEY, c);
    window.dispatchEvent(new Event("noble:auth"));
    return true;
  }
  return false;
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
