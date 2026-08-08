import { useEffect, useState } from "react";
import { PLUGIN_REGISTRY, type PluginId } from "./plugins";
import { isPremium } from "./auth-store";

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

function isToolCategory(id: PluginId): boolean {
  return PLUGIN_REGISTRY.find((p) => p.id === id)?.category === "tool";
}

export function hasPlugin(id: PluginId): boolean {
  // Camera/Calculator/Translator ("tool" category) are bundled with any
  // active Premium subscription — they're never sold or unlocked
  // separately, so Premium being active is enough on its own. "addon"
  // plugins (School Dashboard, PMD) still need their own toggle/voucher.
  if (isToolCategory(id) && isPremium()) return true;
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
  const [state, setState] = useState<Partial<Record<PluginId, boolean>>>(() => getPluginState());
  useEffect(() => {
    const sync = () => setState(getPluginState());
    sync();
    // "noble:auth" covers explicit plugin toggles. resize + a short delayed
    // re-check are cheap safety nets against any render/hydration timing
    // where the very first sync lands before something else settles —
    // window resize (which DevTools opening also fires) is a known trigger
    // for this class of stuck-state issue.
    window.addEventListener("noble:auth", sync);
    window.addEventListener("resize", sync);
    const safetyTimer = setTimeout(sync, 300);
    return () => {
      window.removeEventListener("noble:auth", sync);
      window.removeEventListener("resize", sync);
      clearTimeout(safetyTimer);
    };
  }, []);
  return state;
}

export function usePlugin(id: PluginId): boolean {
  const state = usePluginState();
  const [premium, setPremium] = useState(false);
  useEffect(() => {
    const sync = () => setPremium(isPremium());
    sync();
    window.addEventListener("noble:auth", sync);
    return () => window.removeEventListener("noble:auth", sync);
  }, []);
  if (isToolCategory(id) && premium) return true;
  return !!state[id];
}
