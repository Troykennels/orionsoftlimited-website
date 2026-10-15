// Product tour videos: shown on their watch pages (/demo, /carecore-demo,
// /staffcore-demo, /schoolcore-demo, /compliancecore-demo),
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
  duration: "PT1M48S",
  seconds: 108,
  uploadDate: "2026-10-15",
  overview: { label: "SchoolCore in 2 minutes", about: "Three questions every school owner asks", length: "1:48" },
  parts: [
    { n: 1, title: "Know your whole school before morning assembly", about: "The principal's dashboard", length: "1:33" },
    { n: 2, title: "Find any student in seconds", about: "Student records, ID cards and the daily register", length: "1:19" },
    { n: 3, title: "Report cards in one click", about: "Timetable, scores and report cards", length: "1:15" },
    { n: 4, title: "How much are parents owing you, right now?", about: "Fees, reminders and payments", length: "1:26" },
    { n: 5, title: "What your parents will see", about: "The parent's phone", length: "1:16" },
    { n: 6, title: "Give your teachers their evenings back", about: "A teacher's day", length: "1:23" },
    { n: 7, title: "No code, no child", about: "Child safety at the gate", length: "1:22" },
    { n: 8, title: "Did your teachers really teach today?", about: "Accountability and smart tools", length: "1:23" },
  ].map(p => ({ ...p, src: `/assets/schoolcore/demo/part-${p.n}.mp4`, thumbnail: `/assets/schoolcore/demo/part-${p.n}.jpg` })),
}

// CareCore, told through one hospital morning (the 2026 ad; /demo keeps the
// older full product tour).
export const CARECORE_VIDEO = {
  title: "Is Your Hospital Losing Money It Already Earned? CareCore in 3 Minutes",
  description: "Follow one morning at a Lagos hospital: reception catches a duplicate patient record, AI fills the nurse's triage form from one sentence, a red emergency reaches every doctor as a critical alert, CareCore stops a penicillin-family drug for an allergic patient, every tablet and service lands on the bill, HMO and NHIA claims are tracked, and the owner sees the whole hospital live. CareCore is the hospital management system by Orion Soft Limited.",
  src: "/assets/carecore/carecore-demo.mp4",
  thumbnail: "/assets/carecore/carecore-demo-thumbnail.jpg",
  duration: "PT3M0S",
  seconds: 180,
  uploadDate: "2026-10-15",
}

// ComplianceCore: a short overview, then five parts.
export const COMPLIANCECORE_VIDEO = {
  title: "ComplianceCore in 2 Minutes: Can You Prove It?",
  description: "A customer sends a security questionnaire, a regulator asks for your audit, an investor wants evidence. See how ComplianceCore by Orion Soft Limited tells you which rules apply (NDPR, ISO 27001, PCI DSS, SOC 2 and more), gives every control an owner and proof, keeps policies approved and tamper-evident, starts the 72-hour clock on a breach, and turns it all into a board-ready report.",
  src: "/assets/compliancecore/demo/overview.mp4",
  thumbnail: "/assets/compliancecore/demo/overview.jpg",
  duration: "PT1M26S",
  seconds: 86,
  uploadDate: "2026-10-15",
  overview: { label: "ComplianceCore in 2 minutes", about: "Can you prove it?", length: "1:26" },
  parts: [
    { n: 1, title: "Find out exactly which rules apply to you", about: "Plain questions in, a clear answer out", length: "1:08" },
    { n: 2, title: "How ready are you, right now?", about: "Controls, evidence and your score", length: "0:58" },
    { n: 3, title: "Policies people actually approve", about: "Policies, risks and suppliers", length: "1:04" },
    { n: 4, title: "The 72-hour clock", about: "Breaches, incidents and expiry dates", length: "1:05" },
    { n: 5, title: "Make compliance everyone's job", about: "Teamwork, auditors and the board", length: "1:10" },
  ].map(p => ({ ...p, src: `/assets/compliancecore/demo/part-${p.n}.mp4`, thumbnail: `/assets/compliancecore/demo/part-${p.n}.jpg` })),
}

// Watch page path -> video, for the sitemap.
export const VIDEO_PAGES = { "/demo": DEMO_VIDEO, "/carecore-demo": CARECORE_VIDEO, "/staffcore-demo": STAFFCORE_VIDEO, "/schoolcore-demo": SCHOOLCORE_VIDEO, "/compliancecore-demo": COMPLIANCECORE_VIDEO }
