import { useEffect, useState } from 'react';
const key = 'orion-staff-appearance';
export function useAppearance() {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem(key) || 'system'; } catch { return 'system'; } });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => { document.documentElement.dataset.staffTheme = mode === 'system' ? (media.matches ? 'light' : 'dark') : mode; };
    apply(); media.addEventListener('change', apply);
    try { localStorage.setItem(key, mode); } catch { /* restricted storage */ }
    return () => { media.removeEventListener('change', apply); delete document.documentElement.dataset.staffTheme; };
  }, [mode]);
  return [mode, setMode];
}
