// Opaque customer payment links only. Never store or display a licence key here.
export function normaliseRenewalLink(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:' || url.hostname !== 'olm-console-production.up.railway.app' || url.port || url.username || url.password || url.search || url.hash || !/^\/pay\/[A-Za-z0-9_-]{24,128}$/.test(url.pathname)) return '';
    return url.href;
  } catch { return ''; }
}
