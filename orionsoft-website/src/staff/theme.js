// Shared design tokens for the staff portal — matches src/admin/Dashboard.jsx's
// palette so the two portals feel like one product, kept as a separate small
// module so the staff bundle doesn't pull in the entire admin chunk.
export const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828", cardHover: "#141E30",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(200,168,80,0.35)",
  white: "#FFFFFF", heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#6B7A96",
  gold: "#C8A850", goldLight: "#E8C96A", goldDim: "rgba(200,168,80,0.12)",
  blue: "#4F8EF7", blueDim: "rgba(79,142,247,0.12)",
  mint: "#10B981", mintDim: "rgba(16,185,129,0.12)",
  amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  rose: "#F43F5E", roseDim: "rgba(244,63,94,0.12)",
};
export const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";
