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
  duration: "PT2M57S",
  seconds: 177,
  uploadDate: "2026-10-14",
}

// SchoolCore: a short overview, then eight parts that each answer one question.
export const SCHOOLCORE_VIDEO = {
  title: "SchoolCore in 2 Minutes: Three Questions Every School Owner Asks",
  description: "How much are we still owed? Did my teachers come, and teach? Who collected that child? See how SchoolCore, the school management software by Orion Soft Limited, answers all three, then watch the eight short parts: the principal's dashboard, students and ID cards, report cards, fees, the parent's phone, a teacher's day, gate safety and accountability.",
  src: "/assets/schoolcore/demo/overview.mp4",
  thumbnail: "/assets/schoolcore/demo/overview.jpg",
  duration: "PT1M44S",
  seconds: 104,
  uploadDate: "2026-10-13",
  parts: [
    { n: 1, title: "Know your whole school before morning assembly", about: "The principal's dashboard", length: "1:40" },
    { n: 2, title: "Find any student in seconds", about: "Student records, ID cards and the daily register", length: "1:23" },
    { n: 3, title: "Report cards in one click", about: "Timetable, scores and report cards", length: "1:22" },
    { n: 4, title: "How much are parents owing you, right now?", about: "Fees, reminders and payments", length: "1:28" },
    { n: 5, title: "What your parents will see", about: "The parent's phone", length: "1:20" },
    { n: 6, title: "Give your teachers their evenings back", about: "A teacher's day", length: "1:31" },
    { n: 7, title: "No code, no child", about: "Child safety at the gate", length: "1:14" },
    { n: 8, title: "Did your teachers really teach today?", about: "Accountability and smart tools", length: "1:30" },
  ].map(p => ({ ...p, src: `/assets/schoolcore/demo/part-${p.n}.mp4`, thumbnail: `/assets/schoolcore/demo/part-${p.n}.jpg` })),
}

// Watch page path -> video, for the sitemap.
export const VIDEO_PAGES = { "/demo": DEMO_VIDEO, "/staffcore-demo": STAFFCORE_VIDEO, "/schoolcore-demo": SCHOOLCORE_VIDEO }
