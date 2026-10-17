import { useCallback, useState } from "react";
import { api } from "./api.js";
import LocationConsent from "./LocationConsent.jsx";

// Ensures the one-time notice has been accepted; resolves true if OK to proceed.
export function useConsent() {
  const [ask, setAsk] = useState(null);
  const ensure = useCallback(async () => {
    try { if (localStorage.getItem("so_loc_consent")) return true; } catch { /* storage blocked: ask */ }
    return new Promise(resolve => setAsk(() => resolve));
  }, []);
  const modal = ask ? (
    <LocationConsent onClose={() => { ask(false); setAsk(null); }} onAccept={async () => {
      try { localStorage.setItem("so_loc_consent", "1"); } catch { /* ignore */ }
      api("/api/staff/attendance", { method: "POST", body: { action: "consent" } }).catch(() => {});
      ask(true); setAsk(null);
    }} />
  ) : null;
  return { ensure, modal };
}
