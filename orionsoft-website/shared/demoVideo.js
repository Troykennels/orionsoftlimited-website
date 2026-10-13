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
  title: "StaffCore Staff Portal: Product Tour",
  description: "See StaffCore, the staff portal by Orion Soft Limited, at work: a field sales executive clocks in on his phone with GPS, posts his stand-up, checks in at clients, updates a task and requests leave; his manager sees the team live, checks locations, approves the leave, assigns work and reviews performance and a staff query.",
  src: "/assets/staffcore/staffcore-demo.mp4",
  thumbnail: "/assets/staffcore/staffcore-demo-thumbnail.jpg",
  duration: "PT3M12S",
  seconds: 192,
  uploadDate: "2026-10-13",
}

// Watch page path -> video, for the sitemap.
export const VIDEO_PAGES = { "/demo": DEMO_VIDEO, "/staffcore-demo": STAFFCORE_VIDEO }
