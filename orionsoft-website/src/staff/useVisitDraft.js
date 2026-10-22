import { useEffect, useRef, useState } from "react";
import { readVisitDraft, writeVisitDraft, clearVisitDraft } from "./visitDrafts.js";

export function useVisitDraft(employeeId, scope, defaults) {
  const [data, setData] = useState(defaults);
  const [loadedKey, setLoadedKey] = useState(null);
  const key = employeeId && scope ? JSON.stringify([employeeId, scope]) : null;
  const ready = !!key && loadedKey === key;
  const [status, setStatus] = useState("");
  const current = useRef(defaults);
  const pending = useRef(Promise.resolve(true));
  const version = useRef(0);
  useEffect(() => {
    let active = true;
    ++version.current;
    if (!employeeId || !scope) return () => { active = false; };
    readVisitDraft(employeeId, scope).then(saved => {
      if (!active) return;
      current.current = { ...defaults, ...saved };
      setData(current.current);
      setStatus(saved?.photoMissing ? "Photo could not be restored. Please take it again." : saved ? "Draft restored on this device" : "");
      setLoadedKey(key);
    }).catch(() => { if (active) { current.current = defaults; setData(defaults); setStatus("Draft storage is unavailable. Keep this page open."); setLoadedKey(key); } });
    return () => { active = false; };
    // Defaults are a seed for this employee/visit, never a replacement for work in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, scope]);
  function update(change) {
    const next = typeof change === "function" ? change(current.current) : { ...current.current, ...change };
    current.current = next;
    setData(next);
    setStatus("Saving draft…");
    const revision = ++version.current;
    // writeVisitDraft checkpoints text synchronously before awaiting IndexedDB.
    pending.current = writeVisitDraft(employeeId, scope, next).then(() => {
      if (revision === version.current) setStatus("Draft saved on this device");
      return true;
    }).catch(error => {
      if (revision === version.current) setStatus(error.message);
      return false;
    });
  }
  async function clear() {
    await pending.current;
    ++version.current;
    await clearVisitDraft(employeeId, scope);
    current.current = defaults;
    setData(defaults);
    setStatus("");
  }
  return { data, ready, status, update, clear, flush: () => pending.current };
}
