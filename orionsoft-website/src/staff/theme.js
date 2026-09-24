// Shared design tokens for the Staff Office. Matches src/admin/Dashboard.jsx's
// palette so the two portals feel like one product, kept as a separate small
// module so the staff bundle doesn't pull in the entire admin chunk.
export const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828", cardHover: "#141E30", raised: "#131D2F",
  border: "rgba(255,255,255,0.07)", borderStrong: "rgba(255,255,255,0.13)", borderHover: "rgba(200,168,80,0.35)",
  white: "#FFFFFF", heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#8391AB",
  gold: "#C8A850", goldLight: "#E8C96A", goldDim: "rgba(200,168,80,0.12)",
  blue: "#4F8EF7", blueDim: "rgba(79,142,247,0.12)",
  mint: "#10B981", mintDim: "rgba(16,185,129,0.12)",
  amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  rose: "#F43F5E", roseDim: "rgba(244,63,94,0.12)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.12)",
  cyan: "#06B6D4", cyanDim: "rgba(6,182,212,0.12)",
};
export const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";

export const PRESENCE = {
  available: { label: "Available", color: "#10B981" },
  meeting:   { label: "In a meeting", color: "#8B5CF6" },
  field:     { label: "On field visit", color: "#06B6D4" },
  focus:     { label: "Focus time", color: "#F59E0B" },
  break:     { label: "On a break", color: "#C8A850" },
  away:      { label: "Away", color: "#8391AB" },
  leave:     { label: "On leave", color: "#F43F5E" },
  offline:   { label: "Offline", color: "#4B5870" },
};

export const SOCIAL_META = {
  linkedin:  { label: "LinkedIn", color: "#0A66C2" },
  x:         { label: "X (Twitter)", color: "#E7E9EA" },
  facebook:  { label: "Facebook", color: "#1877F2" },
  instagram: { label: "Instagram", color: "#E4405F" },
  tiktok:    { label: "TikTok", color: "#25F4EE" },
  github:    { label: "GitHub", color: "#C9D1D9" },
  youtube:   { label: "YouTube", color: "#FF0000" },
  website:   { label: "Website", color: "#C8A850" },
};
