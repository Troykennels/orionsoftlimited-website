import { useState } from "react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const LC = {
  bg:           "#FFFFFF",
  bgSection:    "#F5F7FC",
  bgDark:       "#061828",
  navy:         "#061828",
  gold:         "#C8A850",
  goldLight:    "#E8C96A",
  goldDim:      "rgba(200,168,80,0.10)",
  text:         "#1A2B3C",
  textLight:    "#4A5B6C",
  textMuted:    "#8094A8",
  border:       "rgba(6,24,40,0.07)",
  borderStrong: "rgba(6,24,40,0.14)",
  white:        "#FFFFFF",
  shadow:       "0 2px 16px rgba(6,24,40,0.06)",
  shadowMd:     "0 10px 40px rgba(6,24,40,0.11)",
  shadowLg:     "0 24px 80px rgba(6,24,40,0.16)",
};
const font = "'Instrument Sans','DM Sans',system-ui,-apple-system,sans-serif";

// ─── Illustrations ─────────────────────────────────────────────────────────────

function IllCareAI() {
  const nodes = [[55,45],[25,95],[90,120],[45,155],[130,70],[168,42],[100,160]];
  const edges = [[0,1],[0,2],[1,3],[0,4],[4,5],[2,6],[4,2]];
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-cia" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFF6FF"/><stop offset="100%" stopColor="#DBEAFE"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-cia)"/>
      {edges.map(([a,b],i)=>(
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="#93C5FD" strokeWidth="1.5" strokeOpacity="0.45"/>
      ))}
      {nodes.map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="5" fill="#60A5FA" fillOpacity="0.6"/>
      ))}
      <circle cx="278" cy="95" r="64" fill="#3B82F6" fillOpacity="0.06"/>
      <circle cx="278" cy="95" r="50" stroke="#60A5FA" strokeWidth="1" strokeOpacity="0.22" strokeDasharray="5 4" fill="none"/>
      <rect x="246" y="72" width="64" height="22" rx="5" fill="white" fillOpacity="0.85"/>
      <rect x="267" y="51" width="22" height="64" rx="5" fill="white" fillOpacity="0.85"/>
      <rect x="314" y="16" width="48" height="24" rx="7" fill="#2563EB"/>
      <text x="338" y="33" textAnchor="middle" fontSize="12" fontWeight="800" fill="white" fontFamily="system-ui">AI</text>
      <rect x="294" y="148" width="13" height="30" rx="3" fill="#93C5FD" fillOpacity="0.55"/>
      <rect x="313" y="136" width="13" height="42" rx="3" fill="#60A5FA" fillOpacity="0.65"/>
      <rect x="332" y="126" width="13" height="52" rx="3" fill="#3B82F6" fillOpacity="0.8"/>
      <rect x="351" y="140" width="13" height="38" rx="3" fill="#60A5FA" fillOpacity="0.6"/>
      <path d="M196,56 Q196,44 207,44 Q210,36 220,38 Q228,30 238,38 Q248,38 248,50 Q252,58 242,60 Z" fill="white" fillOpacity="0.6"/>
    </svg>
  );
}

function IllCareLocal() {
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-cl" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5"/><stop offset="100%" stopColor="#D1FAE5"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-cl)"/>
      {[0,1,2].map(i=>(
        <g key={i}>
          <rect x="26" y={44+i*34} width="90" height="28" rx="5" fill="#6EE7B7" fillOpacity="0.3" stroke="#10B981" strokeWidth="1" strokeOpacity="0.35"/>
          <circle cx="44" cy={58+i*34} r="4.5" fill="#34D399" fillOpacity="0.8"/>
          <rect x="58" y={53+i*34} width="44" height="3.5" rx="1.5" fill="#10B981" fillOpacity="0.4"/>
          <rect x="58" y={61+i*34} width="28" height="3.5" rx="1.5" fill="#10B981" fillOpacity="0.28"/>
        </g>
      ))}
      {[0,1,2].map(i=>(
        <g key={i}>
          <ellipse cx="248" cy={156-i*24} rx="54" ry="14" fill="#6EE7B7" fillOpacity={0.35+i*0.08}/>
          <rect x="194" y={132-i*24} width="108" height="24" fill="#10B981" fillOpacity={0.12+i*0.04}/>
          <ellipse cx="248" cy={132-i*24} rx="54" ry="14" fill="#34D399" fillOpacity={0.45+i*0.08} stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.3"/>
        </g>
      ))}
      <path d="M248,38 L302,60 L302,112 Q302,150 248,168 Q194,150 194,112 L194,60 Z"
        fill="none" stroke="#059669" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="6 4"/>
      <rect x="234" y="76" width="28" height="22" rx="5" fill="#059669" fillOpacity="0.65"/>
      <path d="M240,76 Q240,65 248,65 Q256,65 256,76" stroke="#047857" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="248" cy="88" r="3" fill="white" fillOpacity="0.8"/>
      <rect x="312" y="18" width="56" height="24" rx="7" fill="#065F46"/>
      <text x="340" y="34" textAnchor="middle" fontSize="10" fontWeight="800" fill="#6EE7B7" fontFamily="system-ui">LOCAL</text>
      <rect x="308" y="88" width="7" height="30" rx="2" fill="#10B981" fillOpacity="0.3"/>
      <rect x="321" y="78" width="7" height="40" rx="2" fill="#10B981" fillOpacity="0.45"/>
      <rect x="334" y="66" width="7" height="52" rx="2" fill="#059669" fillOpacity="0.6"/>
      <rect x="347" y="56" width="7" height="62" rx="2" fill="#047857" fillOpacity="0.75"/>
    </svg>
  );
}

function IllSchool() {
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-sms" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB"/><stop offset="100%" stopColor="#FEF3C7"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-sms)"/>
      <path d="M130,72 Q130,62 144,60 L196,66 L196,152 L144,146 Q130,144 130,132 Z" fill="#FDE68A" fillOpacity="0.65"/>
      <path d="M196,66 L248,60 Q262,62 262,72 L262,132 Q262,144 248,146 L196,152 Z" fill="#FCD34D" fillOpacity="0.6"/>
      <line x1="196" y1="66" x2="196" y2="152" stroke="#F59E0B" strokeWidth="2" strokeOpacity="0.45"/>
      {[0,1,2,3].map(i=>(
        <line key={i} x1="144" y1={82+i*16} x2="186" y2={84+i*16} stroke="#D97706" strokeWidth="1.5" strokeOpacity="0.28"/>
      ))}
      {[0,1,2,3].map(i=>(
        <line key={i} x1="208" y1={82+i*16} x2="248" y2={84+i*16} stroke="#D97706" strokeWidth="1.5" strokeOpacity="0.28"/>
      ))}
      <rect x="161" y="40" width="70" height="14" rx="3" fill="#B45309"/>
      <polygon points="196,22 232,40 196,40 160,40" fill="#92400E"/>
      <line x1="232" y1="40" x2="232" y2="57" stroke="#92400E" strokeWidth="2.5"/>
      <circle cx="232" cy="59" r="5" fill="#D97706"/>
      {[[310,26],[340,18],[326,48]].map(([x,y],i)=>(
        <path key={i} d={`M${x},${y} L${x+5},${y+11} L${x+13},${y+5} L${x+2},${y+11} L${x+8},${y+2} Z`}
          fill="#F59E0B" fillOpacity="0.75"/>
      ))}
      <rect x="290" y="108" width="74" height="9" rx="3" fill="#FDE68A"/>
      <rect x="290" y="108" width="64" height="9" rx="3" fill="#F59E0B" fillOpacity="0.65"/>
      <rect x="290" y="124" width="74" height="9" rx="3" fill="#FDE68A"/>
      <rect x="290" y="124" width="46" height="9" rx="3" fill="#F59E0B" fillOpacity="0.65"/>
      <rect x="290" y="140" width="74" height="9" rx="3" fill="#FDE68A"/>
      <rect x="290" y="140" width="70" height="9" rx="3" fill="#F59E0B" fillOpacity="0.65"/>
      <rect x="38" y="130" width="58" height="34" rx="8" fill="#F59E0B"/>
      <text x="67" y="153" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" fontFamily="system-ui">A+</text>
    </svg>
  );
}

function IllDirectors() {
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-dp" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0A1628"/><stop offset="100%" stopColor="#152840"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-dp)"/>
      {[0,1,2,3,4].map(i=>(
        <line key={`h${i}`} x1="0" y1={i*38+19} x2="380" y2={i*38+19} stroke="white" strokeWidth="0.5" strokeOpacity="0.05"/>
      ))}
      {[0,1,2,3,4,5,6].map(i=>(
        <line key={`v${i}`} x1={i*54+27} y1="0" x2={i*54+27} y2="190" stroke="white" strokeWidth="0.5" strokeOpacity="0.05"/>
      ))}
      {[60,82,50,98,75].map((h,i)=>(
        <rect key={i} x={26+i*24} y={132-h} width="16" height={h} rx="4" fill="#C8A850" fillOpacity={0.25+i*0.12}/>
      ))}
      <line x1="22" y1="134" x2="148" y2="134" stroke="#C8A850" strokeWidth="1" strokeOpacity="0.25"/>
      <polyline points="26,130 50,114 74,120 98,100 122,84 146,68"
        stroke="#C8A850" fill="none" strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="296" cy="92" r="58" fill="none" stroke="#C8A850" strokeWidth="18" strokeOpacity="0.1"/>
      <circle cx="296" cy="92" r="58" fill="none" stroke="#C8A850" strokeWidth="18"
        strokeDasharray="217 146" strokeDashoffset="0" strokeLinecap="round"/>
      <circle cx="296" cy="92" r="58" fill="none" stroke="#E8C96A" strokeWidth="18"
        strokeDasharray="90 273" strokeDashoffset="-217" strokeLinecap="round" strokeOpacity="0.45"/>
      <circle cx="296" cy="92" r="32" fill="#061828"/>
      <text x="296" y="96" textAnchor="middle" fontSize="20" fontWeight="900" fill="#C8A850" fontFamily="system-ui">74%</text>
      <text x="296" y="112" textAnchor="middle" fontSize="9" fill="#C8A850" fillOpacity="0.55" fontFamily="system-ui">GROWTH</text>
      {[44,74,104].map((x,i)=>(
        <circle key={i} cx={x} cy="28" r="13" fill="#C8A850" fillOpacity={0.12+i*0.06}
          stroke="#C8A850" strokeWidth="1" strokeOpacity="0.3"/>
      ))}
      <rect x="306" y="16" width="62" height="24" rx="7" fill="#C8A850"/>
      <text x="337" y="32" textAnchor="middle" fontSize="11" fontWeight="800" fill="#06100E" fontFamily="system-ui">EXEC</text>
      {[35,55,75,95,115,135].map((x,i)=>(
        <line key={i} x1={x} y1="155" x2={x} y2="180" stroke="#C8A850" strokeWidth="1.5" strokeOpacity="0.2"/>
      ))}
    </svg>
  );
}

function IllCompliance() {
  const items = ["NDPR","CAC","CBN","NAFDAC"];
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-cco" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB"/><stop offset="100%" stopColor="#FEF9C3"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-cco)"/>
      <path d="M128,22 L208,48 L208,116 Q208,162 128,182 Q48,162 48,116 L48,48 Z"
        fill="#C8A850" fillOpacity="0.1"/>
      <path d="M128,22 L208,48 L208,116 Q208,162 128,182 Q48,162 48,116 L48,48 Z"
        stroke="#C8A850" strokeWidth="2.5" fill="none" strokeOpacity="0.45"/>
      <circle cx="128" cy="102" r="30" fill="#C8A850" fillOpacity="0.06"/>
      <path d="M96,100 L118,124 L162,78" stroke="#C8A850" strokeWidth="8"
        strokeLinecap="round" strokeLinejoin="round"/>
      {items.map((label,i)=>(
        <g key={label}>
          <rect x="238" y={28+i*36} width="20" height="20" rx="5"
            fill="#C8A850" fillOpacity="0.14" stroke="#C8A850" strokeWidth="1.5" strokeOpacity="0.4"/>
          <path d={`M243,${38+i*36} L248,${43+i*36} L258,${33+i*36}`}
            stroke="#C8A850" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="268" y={42+i*36} fontSize="12.5" fontWeight="700" fill="#92400E" fillOpacity="0.65" fontFamily="system-ui">{label}</text>
        </g>
      ))}
      <rect x="236" y="178" width="122" height="10" rx="3" fill="#F59E0B" fillOpacity="0.18"/>
      <text x="297" y="188" textAnchor="middle" fontSize="8.5" fill="#92400E" fillOpacity="0.55" fontFamily="system-ui">REGULATORY CALENDAR</text>
    </svg>
  );
}

function IllInventory() {
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-inv" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5F3FF"/><stop offset="100%" stopColor="#EDE9FE"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-inv)"/>
      <path d="M78,92 L128,66 L178,92 L128,118 Z" fill="#DDD6FE" fillOpacity="0.75"/>
      <path d="M78,92 L78,134 L128,160 L128,118 Z" fill="#A78BFA" fillOpacity="0.5"/>
      <path d="M128,118 L128,160 L178,134 L178,92 Z" fill="#7C3AED" fillOpacity="0.5"/>
      <path d="M148,60 L198,34 L248,60 L198,86 Z" fill="#C4B5FD" fillOpacity="0.7"/>
      <path d="M148,60 L148,80 L198,106 L198,86 Z" fill="#8B5CF6" fillOpacity="0.4"/>
      <path d="M198,86 L198,106 L248,80 L248,60 Z" fill="#6D28D9" fillOpacity="0.45"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
        <rect key={i} x={258+i*6} y={150} width={i%3===0?3:5} height={i%2===0?30:24} rx="0.5"
          fill="#6D28D9" fillOpacity="0.45"/>
      ))}
      <text x="289" y="192" textAnchor="middle" fontSize="8" fill="#6D28D9" fillOpacity="0.45" fontFamily="system-ui">INV-00291</text>
      <polyline points="258,92 274,82 290,74 306,60 322,50 338,38"
        stroke="#8B5CF6" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.65"/>
      <polygon points="338,30 330,40 346,40" fill="#7C3AED" fillOpacity="0.75"/>
      <circle cx="198" cy="58" r="8" fill="#7C3AED" fillOpacity="0.25"/>
      <circle cx="198" cy="58" r="3.5" fill="#6D28D9" fillOpacity="0.6"/>
      <circle cx="198" cy="58" r="1.5" fill="white" fillOpacity="0.7"/>
    </svg>
  );
}

function IllCustomDev() {
  const codeLines = [
    {x:34,y:56,items:[{w:20,c:"#818CF8"},{w:55,c:"#34D399"},{w:38,c:"#94A3B8"}]},
    {x:34,y:72,items:[{w:12,c:"#60A5FA"},{w:35,c:"#94A3B8"},{w:20,c:"#F472B6"}]},
    {x:44,y:88,items:[{w:44,c:"#FBBF24"},{w:28,c:"#34D399"}]},
    {x:34,y:104,items:[{w:30,c:"#818CF8"},{w:50,c:"#94A3B8"}]},
    {x:34,y:120,items:[{w:15,c:"#60A5FA"},{w:38,c:"#C084FC"},{w:22,c:"#34D399"}]},
    {x:34,y:136,items:[{w:50,c:"#F59E0B"},{w:20,c:"#94A3B8"}]},
  ];
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-csd" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B"/><stop offset="100%" stopColor="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-csd)"/>
      <rect x="20" y="20" width="206" height="152" rx="10" fill="#0F172A" stroke="#334155" strokeWidth="1.5"/>
      <circle cx="38" cy="37" r="5" fill="#F43F5E" fillOpacity="0.7"/>
      <circle cx="53" cy="37" r="5" fill="#F59E0B" fillOpacity="0.7"/>
      <circle cx="68" cy="37" r="5" fill="#10B981" fillOpacity="0.7"/>
      {codeLines.map((row, ri) => {
        let cx = row.x;
        return row.items.map((item, ii) => {
          const block = <rect key={`${ri}-${ii}`} x={cx} y={row.y} width={item.w} height="8" rx="2" fill={item.c}/>;
          cx += item.w + 6;
          return block;
        });
      })}
      <rect x="34" y="152" width="12" height="8" rx="1" fill="#64748B" fillOpacity="0.7"/>
      <text x="302" y="90" textAnchor="middle" fontSize="80" fontWeight="900" fill="#34D399" fillOpacity="0.1" fontFamily="monospace">{"{"}</text>
      <text x="366" y="90" textAnchor="middle" fontSize="80" fontWeight="900" fill="#34D399" fillOpacity="0.1" fontFamily="monospace">{"}"}</text>
      <rect x="248" y="108" width="38" height="38" rx="9" fill="#818CF8" fillOpacity="0.65"/>
      <rect x="294" y="108" width="38" height="38" rx="9" fill="#34D399" fillOpacity="0.45"/>
      <rect x="248" y="152" width="38" height="22" rx="7" fill="#F472B6" fillOpacity="0.45"/>
      <rect x="294" y="152" width="38" height="22" rx="7" fill="#FBBF24" fillOpacity="0.4"/>
      <rect x="340" y="120" width="24" height="24" rx="6" fill="#60A5FA" fillOpacity="0.4"/>
      <line x1="340" y1="120" x2="332" y2="127" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="340" y1="152" x2="332" y2="148" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.5"/>
    </svg>
  );
}

function IllAIAuto() {
  const left  = [[42,42],[28,88],[56,134],[42,166]];
  const mid   = [[96,58],[96,104],[96,150]];
  const edges = [[0,4],[0,5],[1,4],[1,5],[2,5],[2,6],[3,6]];
  const all   = [...left,...mid];
  return (
    <svg viewBox="0 0 380 190" fill="none" aria-hidden="true" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="g-aia" x1="0" y1="0" x2="380" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFEFF"/><stop offset="100%" stopColor="#CFFAFE"/>
        </linearGradient>
      </defs>
      <rect width="380" height="190" fill="url(#g-aia)"/>
      {edges.map(([a,b],i)=>(
        <line key={i} x1={all[a][0]} y1={all[a][1]} x2={all[b][0]} y2={all[b][1]}
          stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.38"/>
      ))}
      {left.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6" fill="#22D3EE" fillOpacity="0.5"/>)}
      {mid.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6" fill="#0891B2" fillOpacity="0.65"/>)}
      <circle cx="210" cy="95" r="52" fill="none" stroke="#06B6D4" strokeWidth="10"
        strokeOpacity="0.18" strokeDasharray="14 8"/>
      <circle cx="210" cy="95" r="38" fill="#06B6D4" fillOpacity="0.07" stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.25"/>
      <circle cx="210" cy="95" r="26" fill="#0891B2" fillOpacity="0.12"/>
      <text x="210" y="101" textAnchor="middle" fontSize="22" fontWeight="900" fill="#0891B2" fillOpacity="0.55" fontFamily="system-ui">AI</text>
      <line x1="257" y1="95" x2="277" y2="95" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.45"/>
      <polygon points="277,90 284,95 277,100" fill="#06B6D4" fillOpacity="0.45"/>
      {[42,88,134].map((y,i)=>(
        <g key={i}>
          <rect x="286" y={y} width="40" height="28" rx="8" fill="#06B6D4"
            fillOpacity={0.13+i*0.04} stroke="#0891B2" strokeWidth="1" strokeOpacity="0.28"/>
          <rect x="332" y={y} width="40" height="28" rx="8" fill="#06B6D4"
            fillOpacity={0.13+i*0.04} stroke="#0891B2" strokeWidth="1" strokeOpacity="0.28"/>
          <line x1="326" y1={y+14} x2="332" y2={y+14} stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.4"/>
        </g>
      ))}
      <line x1="306" y1="70" x2="306" y2="88" stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.4"/>
      <line x1="306" y1="116" x2="306" y2="134" stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.4"/>
      <polygon points="306,88 302,82 310,82" fill="#06B6D4" fillOpacity="0.45"/>
      <polygon points="306,134 302,128 310,128" fill="#06B6D4" fillOpacity="0.45"/>
    </svg>
  );
}

// ─── Product data ──────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: "carecore-ai",
    name: "CareCore AI",
    category: "Healthcare",
    tagline: "Cloud Hospital Management",
    desc: "AI-powered cloud platform for modern hospitals. Patient records, clinical workflows, pharmacy, lab, billing, and real-time analytics accessible from any device, from anywhere.",
    color: "#4F8EF7",
    badge: null,
    Illustration: IllCareAI,
    benefits: [
      "AI-assisted clinical decision support",
      "Cloud access from any device or location",
      "Multi-branch real-time analytics dashboard",
      "NHIS, LHIS and insurance billing automation",
    ],
    page: "carecore",
    cta: "Explore CareCore →",
  },
  {
    id: "carecore-local",
    name: "CareCore Local",
    category: "Healthcare",
    tagline: "Offline Hospital Management",
    desc: "Full-featured hospital management that runs completely offline. Designed for areas with unreliable internet zero dependency on connectivity, zero compromise on functionality.",
    color: "#10B981",
    badge: null,
    Illustration: IllCareLocal,
    benefits: [
      "100% offline operation no internet required",
      "Automatic sync when connection is restored",
      "On-premise data storage for full compliance",
      "Same 25+ modules as CareCore AI",
    ],
    page: "carecore",
    cta: "Explore CareCore →",
  },
  {
    id: "schoolcore",
    name: "School Management System",
    category: "Business Software",
    tagline: "Academic & School Operations",
    desc: "End-to-end school management for primary, secondary, and tertiary institutions. Admissions, attendance, academic records, fee management, and a parent portal in one system.",
    color: "#F59E0B",
    badge: null,
    Illustration: IllSchool,
    benefits: [
      "WAEC/NECO result format built in",
      "Online and offline fee collection",
      "Real-time parent communication portal",
      "CBT examination and timetable builder",
    ],
    page: "schoolcore",
    cta: "Explore SchoolCore →",
  },
  {
    id: "directors-portal",
    name: "Directors' Portal",
    category: "Business Software",
    tagline: "Executive Intelligence & Governance",
    desc: "Built for organisations already running multiple Orion Soft products. The Directors' Portal connects them, pulling live KPIs, operational status, and financial summaries into a single board-level view. No more chasing department heads for weekly reports.",
    color: "#C8A850",
    badge: "NEW",
    Illustration: IllDirectors,
    benefits: [
      "Live data from CareCore, SchoolCore, InventoryCore in one screen",
      "Drill-down from summary to department to individual record",
      "Board pack generation with scheduled email delivery",
      "Access controlled per director, with no cross-visibility by default",
    ],
    page: "contact",
    cta: "Request a Demo →",
  },
  {
    id: "compliancecore",
    name: "ComplianceCore",
    category: "Business Software",
    tagline: "Compliance & Risk Management",
    desc: "Stay perpetually audit-ready with automated tracking of Nigerian regulatory requirements. Policies, risk registers, audit trails, and a full regulatory calendar all in one place.",
    color: "#C8A850",
    badge: null,
    Illustration: IllCompliance,
    benefits: [
      "Nigerian regulatory calendar (NDPR, CAC, CBN, NAFDAC)",
      "Policy management and document control",
      "Risk register with automated alerting",
      "Full audit trail for every action",
    ],
    page: "compliancecore",
    cta: "Explore ComplianceCore →",
  },
  {
    id: "inventorycore",
    name: "Inventory Management System",
    category: "Business Software",
    tagline: "Inventory & Supply Chain",
    desc: "Real-time stock visibility across every warehouse, branch, and location. Purchase orders, reorder alerts, batch and expiry tracking, barcode scanning, and supplier management.",
    color: "#8B5CF6",
    badge: null,
    Illustration: IllInventory,
    benefits: [
      "Multi-warehouse real-time stock tracking",
      "Expiry and batch management for healthcare & FMCG",
      "Automated purchase orders and reorder alerts",
      "Barcode and QR code scanning",
    ],
    page: "inventorycore",
    cta: "Explore InventoryCore →",
  },
  {
    id: "custom-dev",
    name: "Custom Software Development",
    category: "Technology",
    tagline: "Bespoke Websites, Web Apps & Mobile Apps",
    desc: "When an off-the-shelf product won't do, we build to your exact specification. Websites, web applications, mobile apps, API development, and end-to-end digital transformation projects.",
    color: "#6366F1",
    badge: "SERVICE",
    Illustration: IllCustomDev,
    benefits: [
      "Business websites, e-commerce and corporate portals",
      "Custom web applications and admin dashboards",
      "iOS and Android mobile apps (cross-platform or native)",
      "API development, integrations and cloud migrations",
    ],
    page: "contact",
    cta: "Start a Project →",
  },
  {
    id: "ai-automation",
    name: "AI Business Automation",
    category: "Technology",
    tagline: "Automate the repeatable. Focus on the work that matters.",
    desc: "Most Nigerian businesses are running manual processes that don't need to be manual. We identify which workflows can be automated, build the pipelines, and connect them to your existing systems. Common use cases: invoice extraction from email, automated compliance reporting, and data sync between separate systems that weren't built to talk to each other.",
    color: "#06B6D4",
    badge: "NEW",
    Illustration: IllAIAuto,
    benefits: [
      "Invoice and document extraction from email or scans",
      "Automated compliance report generation",
      "Cross-system data sync without manual export/import",
      "Exception alerts when something falls outside normal thresholds",
    ],
    page: "contact",
    cta: "Request a Demo →",
  },
];

const CATEGORY_MAP = {
  "All":             { label: "All Products",      count: PRODUCTS.length },
  "Healthcare":      { label: "Healthcare",         count: PRODUCTS.filter(p=>p.category==="Healthcare").length },
  "Business Software":{ label: "Business Software", count: PRODUCTS.filter(p=>p.category==="Business Software").length },
  "Technology":      { label: "Technology",         count: PRODUCTS.filter(p=>p.category==="Technology").length },
};
const CATEGORIES = Object.keys(CATEGORY_MAP);

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ p, setCurrentPage }) {
  const [hov, setHov] = useState(false);
  const { Illustration } = p;

  const badgeColors = {
    "NEW":     { bg: LC.navy,    text: "#ffffff" },
    "SERVICE": { bg: "#6366F1",  text: "#ffffff" },
  };
  const bc = p.badge ? badgeColors[p.badge] : null;

  const catColors = {
    "Healthcare":       "#4F8EF7",
    "Business Software":"#8B5CF6",
    "Technology":       "#06B6D4",
  };
  const catColor = catColors[p.category] || LC.navy;

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: LC.white,
        border: `1.5px solid ${hov ? p.color + "45" : LC.border}`,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: hov ? `0 22px 70px ${p.color}14` : LC.shadow,
        transform: hov ? "translateY(-7px)" : "none",
        transition: "all 0.32s cubic-bezier(0.16,1,0.3,1)",
        display: "flex",
        flexDirection: "column",
      }}>

      {/* ── Illustration ── */}
      <div style={{ height: 190, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <Illustration />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: p.color }} />
        {bc && (
          <div style={{
            position: "absolute", top: 14, left: 14,
            background: bc.bg, color: bc.text,
            fontSize: 9.5, fontWeight: 800, fontFamily: font,
            letterSpacing: "0.1em", padding: "4px 10px",
            borderRadius: 5,
          }}>{p.badge}</div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "24px 24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Category + tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 800, fontFamily: font, letterSpacing: "0.09em",
            color: catColor, background: `${catColor}10`,
            borderRadius: 5, padding: "3px 9px",
          }}>{p.category.toUpperCase()}</span>
          <span style={{ fontSize: 11.5, color: LC.textMuted, fontFamily: font }}>{p.tagline}</span>
        </div>

        {/* Product name */}
        <h3 style={{
          fontSize: "clamp(18px,1.8vw,22px)", fontWeight: 900,
          color: LC.navy, fontFamily: font,
          letterSpacing: "-0.02em", margin: "0 0 10px", lineHeight: 1.15,
        }}>{p.name}</h3>

        {/* Description */}
        <p style={{
          fontSize: 13.5, color: LC.textLight, fontFamily: font,
          lineHeight: 1.72, margin: "0 0 20px",
        }}>{p.desc}</p>

        {/* Benefits */}
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
          {p.benefits.map(b => (
            <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <span style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: "50%",
                background: `${p.color}14`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: 1,
              }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke={p.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span style={{ fontSize: 13, color: LC.textLight, fontFamily: font, lineHeight: 1.55 }}>{b}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button type="button" onClick={() => setCurrentPage(p.page)}
          style={{
            marginTop: "auto",
            background: hov ? p.color : "transparent",
            color: hov ? LC.white : LC.navy,
            border: `1.5px solid ${hov ? p.color : LC.borderStrong}`,
            borderRadius: 10, padding: "12px 20px",
            fontSize: 14, fontWeight: 700, fontFamily: font,
            cursor: "pointer", width: "100%",
            transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = p.color; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = p.color; }}
          onMouseLeave={e => { if (!hov) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = LC.navy; e.currentTarget.style.borderColor = LC.borderStrong; } }}>
          {p.cta}
        </button>
      </div>
    </article>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductsPage({ setCurrentPage }) {
  const [activeCat, setActiveCat] = useState("All");

  const displayed = activeCat === "All"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCat);

  return (
    <div style={{ background: LC.bg, minHeight: "100vh" }}>

      {/* ── Page header ── */}
      <section style={{
        background: LC.bg,
        padding: "120px clamp(24px,5vw,80px) 72px",
        borderBottom: `1px solid ${LC.border}`,
      }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: LC.gold, fontFamily: font, letterSpacing: "0.14em", marginBottom: 16 }}>
              PRODUCT SUITE
            </div>
            <h1 style={{
              fontSize: "clamp(36px,4.5vw,68px)", fontWeight: 900,
              color: LC.navy, fontFamily: font,
              lineHeight: 1.04, letterSpacing: "-0.04em",
              margin: "0 0 22px",
            }}>
              Eight platforms.<br />
              One production-grade<br />
              <span style={{ color: LC.gold }}>standard.</span>
            </h1>
            <p style={{ fontSize: "clamp(16px,1.6vw,19px)", color: LC.textLight, fontFamily: font, lineHeight: 1.8, maxWidth: 580 }}>
              From cloud-based hospital management to AI-powered business automation, every Orion Soft platform is purpose-built for its industry engineered to the same security, reliability, and support standard.
            </p>
          </div>
        </div>
      </section>

      {/* ── Category filters ── */}
      <div style={{
        position: "sticky", top: 70, zIndex: 90,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${LC.border}`,
        padding: "0 clamp(24px,5vw,80px)",
      }}>
        <div style={{ maxWidth: 1360, margin: "0 auto", display: "flex", gap: 4, alignItems: "center", height: 58, overflowX: "auto" }}>
          {CATEGORIES.map(cat => {
            const active = cat === activeCat;
            const info = CATEGORY_MAP[cat];
            return (
              <button key={cat} type="button" onClick={() => setActiveCat(cat)}
                style={{
                  background: active ? LC.navy : "transparent",
                  color: active ? LC.white : LC.textMuted,
                  border: `1.5px solid ${active ? LC.navy : LC.border}`,
                  borderRadius: 8, padding: "7px 16px",
                  fontSize: 13.5, fontWeight: 700, fontFamily: font,
                  cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.22s ease",
                  display: "flex", alignItems: "center", gap: 7,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = LC.navy; e.currentTarget.style.color = LC.navy; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = LC.border; e.currentTarget.style.color = LC.textMuted; } }}>
                {info.label}
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  color: active ? "rgba(255,255,255,0.7)" : LC.textMuted,
                  background: active ? "rgba(255,255,255,0.15)" : LC.bgSection,
                  borderRadius: 4, padding: "1px 6px",
                  transition: "all 0.22s",
                }}>{info.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Product grid ── */}
      <section style={{ background: LC.bgSection, padding: "72px clamp(24px,5vw,80px) 120px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {activeCat !== "All" && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: LC.gold, fontFamily: font, letterSpacing: "0.12em", marginBottom: 8 }}>
                {displayed.length} PLATFORM{displayed.length !== 1 ? "S" : ""}
              </div>
              <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 900, color: LC.navy, fontFamily: font, letterSpacing: "-0.03em", margin: 0 }}>
                {activeCat} solutions
              </h2>
            </div>
          )}

          <div className="products-page-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            alignItems: "start",
          }}>
            {displayed.map(p => (
              <ProductCard key={p.id} p={p} setCurrentPage={setCurrentPage} />
            ))}
          </div>

          {/* Contact strip */}
          <div style={{
            marginTop: 72,
            background: LC.bgDark,
            borderRadius: 20,
            padding: "48px clamp(28px,4vw,60px)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: 32, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: LC.gold, fontFamily: font, letterSpacing: "0.12em", marginBottom: 10 }}>NEED SOMETHING CUSTOM?</div>
              <h3 style={{ fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 900, color: "#F2F6FF", fontFamily: font, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
                Don't see exactly what you need?
              </h3>
              <p style={{ fontSize: 15.5, color: "rgba(200,210,226,0.72)", fontFamily: font, maxWidth: 500, lineHeight: 1.7, margin: 0 }}>
                We also build fully bespoke software tell us what you're trying to solve and our team will design a solution around you.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
              <button type="button" onClick={() => setCurrentPage("contact")}
                style={{ background: LC.gold, color: "#06100E", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 14.5, fontWeight: 800, fontFamily: font, cursor: "pointer", boxShadow: "0 6px 28px rgba(200,168,80,0.35)", transition: "all 0.25s", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.background = LC.goldLight; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = LC.gold; e.currentTarget.style.transform = ""; }}>
                Talk to Our Team →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
