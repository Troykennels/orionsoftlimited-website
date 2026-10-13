// Product tour videos: shown on their watch pages (/demo, /staffcore-demo),
// described to search engines in each page's VideoObject (prerender-seo.mjs)
// and the sitemap's video entries.
export const DEMO_VIDEO = {
  title: "CareCore Hospital Management System: Product Tour",
  description: "A 3-minute tour of CareCore HMS by Orion Soft Limited: the live dashboard, patient registration and records, consultation, pharmacy, laboratory, billing with HMO schemes, nursing and management reports, as used in Nigerian hospitals.",
  src: "/assets/carecore/demo-premium-website.mp4",
  thumbnail: "/assets/carecore/demo-thumbnail.jpg",
  duration: "PT2M58S",
  seconds: 178,
  uploadDate: "2026-06-19",
}

export const STAFFCORE_VIDEO = {
  title: "Know Who Is Really at Work: StaffCore in 3 Minutes",
  description: "No more paper registers, signing in for a friend or leave lost in WhatsApp. Watch a field sales executive clock in with GPS, prove his client visits and request leave on his phone, while his manager sees the whole team live, approves in one click and tracks performance from facts, not claims. StaffCore is the staff portal by Orion Soft Limited.",
  src: "/assets/staffcore/staffcore-demo.mp4",
  thumbnail: "/assets/staffcore/staffcore-demo-thumbnail.jpg",
  duration: "PT3M16S",
  seconds: 196,
  uploadDate: "2026-10-13",
}

// Watch page path -> video, for the sitemap.
export const VIDEO_PAGES = { "/demo": DEMO_VIDEO, "/staffcore-demo": STAFFCORE_VIDEO }
