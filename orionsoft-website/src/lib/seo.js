const SITE = 'https://www.orionsoftlimited.com';
let pending;

export function pageMetadata() {
  // The production build writes the same metadata used for direct page loads.
  // Keep a single request per tab and tolerate a temporarily unavailable file.
  return pending ||= fetch('/seo-pages.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
}

export function updateMetadata(path, data = {}, { noindex = false } = {}) {
  const set = (attribute, key, value) => {
    let el = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attribute, key); document.head.appendChild(el); }
    el.content = value;
  };
  const canonical = `${SITE}${path}`;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = canonical;
  if (data.title) document.title = data.title;
  set('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  set('name', 'description', data.description || 'Explore software, services and support from Orion Soft Limited.');
  set('property', 'og:url', canonical);
  set('property', 'og:title', data.title || document.title);
  set('property', 'og:description', data.description || 'Software and services from Orion Soft Limited.');
  set('property', 'og:image', data.image || `${SITE}/og-image.png`);
  set('name', 'twitter:title', data.title || document.title);
  set('name', 'twitter:description', data.description || 'Software and services from Orion Soft Limited.');
  set('name', 'twitter:image', data.image || `${SITE}/og-image.png`);
  // Remove the previous route's article/product/breadcrumb markup. Keep the
  // shared company and website identities, including verified social links.
  for (const script of document.head.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent);
      const graph = parsed['@graph']?.filter(n => /#(organization|website)$/.test(n['@id'] || ''));
      if (graph?.length && !noindex) script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
      else script.remove();
    } catch { script.remove(); }
  }
  if (!noindex) for (const item of data.jsonLd || []) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}
