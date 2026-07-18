import { useEffect, useState } from "react";
import type { PluginId } from "./plugins";

const PLUGINS_KEY = "noble.plugins";

function getPluginState(): Partial<Record<PluginId, boolean>> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(PLUGINS_KEY);
  return raw ? (JSON.parse(raw) as Partial<Record<PluginId, boolean>>) : {};
}

function savePluginState(state: Partial<Record<PluginId, boolean>>) {
  localStorage.setItem(PLUGINS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("noble:auth"));
}

export function hasPlugin(id: PluginId): boolean {
  return !!getPluginState()[id];
}

/**
 * Turn a plugin on or off. Used today by the hidden admin toggle page for
 * testing; the same function is what a future plugin-voucher redemption
 * (bought à la carte, independent of the Standard/Premium subscription)
 * will call once its backend exists.
 */
export function setPluginEnabled(id: PluginId, enabled: boolean) {
  const state = getPluginState();
  state[id] = enabled;
  savePluginState(state);
}

export function usePluginState(): Partial<Record<PluginId, boolean>> {
  const [state, setState] = useState<Partial<Record<PluginId, boolean>>>({});
  useEffect(() => {
    const sync = () => setState(getPluginState());
    sync();
    window.addEventListener("noble:auth", sync);
    return () => window.removeEventListener("noble:auth", sync);
  }, []);
  return state;
}

export function usePlugin(id: PluginId): boolean {
  const state = usePluginState();
  return !!state[id];
}
