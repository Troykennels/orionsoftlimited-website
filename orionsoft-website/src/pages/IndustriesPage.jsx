import { useState, useEffect, useRef } from "react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      "#FFFFFF",
  bgAlt:   "#F5F7FC",
  bgDark:  "#061828",
  navy:    "#061828",
  gold:    "#C8A850",
  text:    "#1A2B3C",
  textSub: "#4A5B6C",
  muted:   "#8094A8",
  border:  "rgba(6,24,40,0.07)",
  shadow:  "0 2px 16px rgba(6,24,40,0.06)",
};
const font = "'Instrument Sans','DM Sans',system-ui,-apple-system,sans-serif";

// ─── Scroll-reveal ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold: 0.06 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(22px)", transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG Illustrations one per industry, 280 × 196 viewBox
// Each uses a unique gradient ID to avoid DOM conflicts.
// ═══════════════════════════════════════════════════════════════════════════════

function IllHealthcare({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".08"/>
      {/* subtle grid */}
      {[0,1,2,3,4,5,6].map(i=><line key={i} x1={i*46} y1="0" x2={i*46} y2="196" stroke={c} strokeOpacity=".06" strokeWidth="1"/>)}
      {[0,1,2,3,4].map(i=><line key={i} x1="0" y1={i*50} x2="280" y2={i*50} stroke={c} strokeOpacity=".06" strokeWidth="1"/>)}
      {/* hospital cross bg */}
      <rect x="107" y="36" width="66" height="124" rx="6" fill={c} fillOpacity=".14"/>
      <rect x="78" y="65" width="124" height="66" rx="6" fill={c} fillOpacity=".14"/>
      {/* hospital cross outline */}
      <rect x="107" y="36" width="66" height="124" rx="6" stroke={c} strokeWidth="2" strokeOpacity=".6"/>
      <rect x="78" y="65" width="124" height="66" rx="6" stroke={c} strokeWidth="2" strokeOpacity=".6"/>
      {/* plus symbol inside */}
      <line x1="140" y1="52" x2="140" y2="144" stroke={c} strokeWidth="3" strokeOpacity=".5" strokeLinecap="round"/>
      <line x1="96" y1="98" x2="184" y2="98" stroke={c} strokeWidth="3" strokeOpacity=".5" strokeLinecap="round"/>
      {/* ECG heartbeat line */}
      <polyline points="10,152 36,152 44,118 52,172 60,108 68,140 80,140 100,140" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".8"/>
      <polyline points="176,140 196,140 212,140" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeOpacity=".5"/>
      {/* stethoscope arc */}
      <circle cx="242" cy="148" r="22" stroke={c} strokeWidth="2.5" fill="none" strokeOpacity=".45"/>
      <circle cx="242" cy="148" r="10" stroke={c} strokeWidth="2" fill={c} fillOpacity=".15" strokeOpacity=".5"/>
      <line x1="224" y1="131" x2="210" y2="104" stroke={c} strokeWidth="2" strokeOpacity=".4" strokeLinecap="round"/>
      <circle cx="208" cy="99" r="5" fill={c} fillOpacity=".5"/>
      {/* small pill badge */}
      <rect x="16" y="36" width="40" height="18" rx="9" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".5"/>
      <line x1="36" y1="36" x2="36" y2="54" stroke={c} strokeWidth="1.5" strokeOpacity=".5"/>
    </svg>
  );
}

function IllEducation({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* open book pages */}
      <path d="M70 140 Q70 55 140 60 Q210 55 210 140 Q175 132 140 135 Q105 132 70 140Z" fill={c} fillOpacity=".13" stroke={c} strokeWidth="2" strokeOpacity=".55"/>
      <line x1="140" y1="60" x2="140" y2="140" stroke={c} strokeWidth="2" strokeOpacity=".55"/>
      {/* book lines (text) */}
      {[80,94,108,122].map(y=><line key={y} x1="84" y1={y} x2="130" y2={y-2} stroke={c} strokeWidth="1.5" strokeOpacity=".35" strokeLinecap="round"/>)}
      {[80,94,108,122].map(y=><line key={y} x1="150" y1={y} x2="196" y2={y-2} stroke={c} strokeWidth="1.5" strokeOpacity=".35" strokeLinecap="round"/>)}
      {/* graduation cap */}
      <polygon points="140,16 192,42 140,58 88,42" fill={c} fillOpacity=".25" stroke={c} strokeWidth="2" strokeOpacity=".6" strokeLinejoin="round"/>
      <rect x="132" y="58" width="16" height="12" rx="2" fill={c} fillOpacity=".3"/>
      <line x1="192" y1="42" x2="192" y2="62" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeOpacity=".6"/>
      <circle cx="192" cy="67" r="5" fill={c} fillOpacity=".7"/>
      {/* stars */}
      {[[240,30],[254,56],[26,46],[18,20]].map(([x,y],i)=>(
        <text key={i} x={x} y={y} textAnchor="middle" fontSize="14" fill={c} fillOpacity=".45" fontFamily="sans-serif">★</text>
      ))}
      {/* A+ badge */}
      <rect x="216" y="110" width="48" height="48" rx="10" fill={c} fillOpacity=".18" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <text x="240" y="143" textAnchor="middle" fontSize="20" fontWeight="900" fill={c} fillOpacity=".75" fontFamily={font}>A+</text>
    </svg>
  );
}

function IllGovernment({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* building base */}
      <rect x="40" y="160" width="200" height="8" rx="2" fill={c} fillOpacity=".5"/>
      {/* building body */}
      <rect x="72" y="90" width="136" height="70" rx="3" fill={c} fillOpacity=".13" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      {/* columns */}
      {[90,112,134,156,178].map(x=>(
        <rect key={x} x={x} y="90" width="10" height="70" rx="2" fill={c} fillOpacity=".22" stroke={c} strokeWidth="1" strokeOpacity=".35"/>
      ))}
      {/* roof pediment */}
      <polygon points="60,90 140,30 220,90" fill={c} fillOpacity=".18" stroke={c} strokeWidth="2" strokeOpacity=".55" strokeLinejoin="round"/>
      {/* door */}
      <rect x="122" y="128" width="36" height="32" rx="4" fill={c} fillOpacity=".3" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      {/* official seal / circle badge */}
      <circle cx="140" cy="62" r="16" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2" strokeOpacity=".55"/>
      <circle cx="140" cy="62" r="9" stroke={c} strokeWidth="1.5" fill="none" strokeOpacity=".4"/>
      {/* stamp stars */}
      {[[24,60],[256,60],[24,140],[256,140]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="6" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1" strokeOpacity=".35"/>
      ))}
      {/* document */}
      <rect x="12" y="80" width="34" height="44" rx="4" fill={c} fillOpacity=".15" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      {[95,105,115].map(y=><line key={y} x1="18" y1={y} x2="40" y2={y} stroke={c} strokeWidth="1" strokeOpacity=".4" strokeLinecap="round"/>)}
    </svg>
  );
}

function IllCorporate({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* Tall skyscraper */}
      <rect x="108" y="28" width="64" height="148" rx="4" fill={c} fillOpacity=".15" stroke={c} strokeWidth="2" strokeOpacity=".55"/>
      {/* windows on main tower */}
      {[40,60,80,100,120,140].map(y=>[116,136,156].map(x=>(
        <rect key={`${x}${y}`} x={x} y={y} width="10" height="10" rx="1.5" fill={c} fillOpacity=".4"/>
      )))}
      {/* Side buildings */}
      <rect x="52" y="68" width="52" height="108" rx="3" fill={c} fillOpacity=".1" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <rect x="176" y="80" width="52" height="96" rx="3" fill={c} fillOpacity=".1" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      {/* windows side */}
      {[82,100,118,136].map(y=>[58,72].map(x=>(
        <rect key={`${x}${y}`} x={x} y={y} width="8" height="8" rx="1" fill={c} fillOpacity=".35"/>
      )))}
      {/* org chart nodes */}
      <circle cx="220" cy="30" r="12" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".5"/>
      <line x1="220" y1="42" x2="220" y2="58" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <line x1="220" y1="58" x2="200" y2="58" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <line x1="220" y1="58" x2="240" y2="58" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <circle cx="200" cy="68" r="9" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <circle cx="240" cy="68" r="9" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      {/* upward chart */}
      <polyline points="14,180 30,155 50,162 68,130 86,118" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".7"/>
      <circle cx="86" cy="118" r="4" fill={c} fillOpacity=".8"/>
    </svg>
  );
}

function IllManufacturing({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* factory building */}
      <rect x="80" y="100" width="120" height="72" rx="3" fill={c} fillOpacity=".14" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      {/* factory roof line */}
      <polyline points="80,100 110,76 140,100 170,76 200,100" stroke={c} strokeWidth="2" strokeOpacity=".55" fill="none"/>
      {/* chimney stacks */}
      <rect x="94" y="56" width="16" height="44" rx="3" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <rect x="120" y="48" width="16" height="52" rx="3" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      {/* smoke puffs */}
      <circle cx="102" cy="46" r="8" fill={c} fillOpacity=".12" stroke={c} strokeWidth="1" strokeOpacity=".3"/>
      <circle cx="111" cy="36" r="6" fill={c} fillOpacity=".1"/>
      <circle cx="128" cy="38" r="9" fill={c} fillOpacity=".12" stroke={c} strokeWidth="1" strokeOpacity=".3"/>
      {/* large gear */}
      <circle cx="222" cy="110" r="42" stroke={c} strokeWidth="3" fill="none" strokeOpacity=".25"/>
      <circle cx="222" cy="110" r="28" stroke={c} strokeWidth="2" fill={c} fillOpacity=".1" strokeOpacity=".4"/>
      <circle cx="222" cy="110" r="10" fill={c} fillOpacity=".35" stroke={c} strokeWidth="1.5" strokeOpacity=".5"/>
      {/* gear teeth (12 teeth) */}
      {Array.from({length:12},(_,i)=>i).map(i=>{
        const angle = (i/12)*Math.PI*2;
        const ix = 222 + Math.cos(angle)*38;
        const iy = 110 + Math.sin(angle)*38;
        return <rect key={i} x={ix-4} y={iy-6} width="8" height="12" rx="2" fill={c} fillOpacity=".45" transform={`rotate(${i*30},${ix},${iy})`}/>;
      })}
      {/* small gear */}
      <circle cx="180" cy="78" r="20" stroke={c} strokeWidth="2" fill="none" strokeOpacity=".3"/>
      <circle cx="180" cy="78" r="8" fill={c} fillOpacity=".2"/>
      {/* conveyor line */}
      <rect x="16" y="158" width="96" height="8" rx="4" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <rect x="28" y="148" width="18" height="10" rx="2" fill={c} fillOpacity=".4"/>
      <rect x="56" y="148" width="18" height="10" rx="2" fill={c} fillOpacity=".4"/>
    </svg>
  );
}

function IllRetail({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* store facade */}
      <rect x="60" y="72" width="160" height="100" rx="4" fill={c} fillOpacity=".12" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      {/* awning */}
      <rect x="50" y="52" width="180" height="28" rx="3" fill={c} fillOpacity=".28" stroke={c} strokeWidth="1.5" strokeOpacity=".55"/>
      {/* awning stripes */}
      {[62,80,98,116,134,152,170,188,206].map(x=><line key={x} x1={x} y1="52" x2={x-8} y2="80" stroke={c} strokeWidth="1.5" strokeOpacity=".3"/>)}
      {/* door */}
      <rect x="116" y="116" width="48" height="56" rx="3" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      {/* windows */}
      <rect x="70" y="88" width="36" height="28" rx="3" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <rect x="174" y="88" width="36" height="28" rx="3" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      {/* shopping bag */}
      <path d="M208 24 L220 24 L224 52 L204 52 Z" fill={c} fillOpacity=".28" stroke={c} strokeWidth="2" strokeOpacity=".6" strokeLinejoin="round"/>
      <path d="M212 24 Q212 16 218 16 Q224 16 224 24" stroke={c} strokeWidth="2" fill="none" strokeOpacity=".55"/>
      {/* price tag */}
      <rect x="14" y="56" width="38" height="22" rx="5" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <circle cx="23" cy="67" r="3" fill={c} fillOpacity=".6"/>
      <line x1="30" y1="62" x2="46" y2="62" stroke={c} strokeWidth="1" strokeOpacity=".5"/>
      <line x1="30" y1="67" x2="46" y2="67" stroke={c} strokeWidth="1" strokeOpacity=".5"/>
      <line x1="30" y1="72" x2="40" y2="72" stroke={c} strokeWidth="1" strokeOpacity=".5"/>
      {/* barcode */}
      {[16,20,24,30,34,38,44,48,52].map((x,i)=>(
        <rect key={x} x={x} y="152" width={i%3===1?2:1.5} height="22" rx="0.5" fill={c} fillOpacity=".55"/>
      ))}
      <line x1="12" y1="174" x2="58" y2="174" stroke={c} strokeWidth="1" strokeOpacity=".35"/>
    </svg>
  );
}

function IllSME({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* small shop */}
      <rect x="54" y="80" width="120" height="96" rx="4" fill={c} fillOpacity=".12" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      {/* roof */}
      <polygon points="44,80 114,40 184,80" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2" strokeOpacity=".55" strokeLinejoin="round"/>
      {/* door */}
      <rect x="96" y="128" width="36" height="48" rx="3" fill={c} fillOpacity=".28" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      {/* window */}
      <rect x="62" y="96" width="30" height="24" rx="3" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <rect x="136" y="96" width="30" height="24" rx="3" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      {/* growth chart */}
      <polyline points="198,175 214,150 232,156 248,120 264,100" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".7"/>
      <circle cx="264" cy="100" r="5" fill={c} fillOpacity=".8"/>
      <line x1="192" y1="180" x2="272" y2="180" stroke={c} strokeWidth="1.5" strokeOpacity=".4" strokeLinecap="round"/>
      <line x1="192" y1="180" x2="192" y2="100" stroke={c} strokeWidth="1.5" strokeOpacity=".4" strokeLinecap="round"/>
      {/* lightbulb */}
      <circle cx="36" cy="40" r="16" fill={c} fillOpacity=".18" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      <line x1="30" y1="56" x2="42" y2="56" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity=".5"/>
      <line x1="32" y1="62" x2="40" y2="62" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity=".4"/>
      <line x1="36" y1="28" x2="36" y2="22" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity=".4"/>
      <line x1="26" y1="31" x2="22" y2="27" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity=".4"/>
      <line x1="46" y1="31" x2="50" y2="27" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity=".4"/>
      {/* coin stack */}
      {[168,160,152].map((y,i)=>(
        <ellipse key={i} cx="224" cy={y} rx="20" ry="5" fill={c} fillOpacity={0.2+i*0.08} stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      ))}
    </svg>
  );
}

function IllNGO({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* globe */}
      <circle cx="140" cy="98" r="62" stroke={c} strokeWidth="2" fill="none" strokeOpacity=".4"/>
      <ellipse cx="140" cy="98" rx="28" ry="62" stroke={c} strokeWidth="1.5" fill="none" strokeOpacity=".3"/>
      <line x1="78" y1="98" x2="202" y2="98" stroke={c} strokeWidth="1.5" strokeOpacity=".3"/>
      <ellipse cx="140" cy="98" rx="62" ry="22" stroke={c} strokeWidth="1.5" fill="none" strokeOpacity=".25"/>
      <circle cx="140" cy="98" r="62" fill={c} fillOpacity=".08"/>
      {/* heart overlay */}
      <path d="M140,132 Q112,114 108,96 Q104,78 122,76 Q132,74 140,86 Q148,74 158,76 Q176,78 172,96 Q168,114 140,132Z"
        fill={c} fillOpacity=".3" stroke={c} strokeWidth="2" strokeOpacity=".6"/>
      {/* network people nodes */}
      {[[26,52],[254,52],[18,148],[262,148]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y-10} r="8" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
          <path d={`M${x-10},${y+10} Q${x},${y} ${x+10},${y+10}`} stroke={c} strokeWidth="1.5" fill={c} fillOpacity=".15" strokeOpacity=".4"/>
          <line x1={x} y1={y+10} x2="140" y2="98" stroke={c} strokeWidth="1" strokeOpacity=".2" strokeDasharray="4 4"/>
        </g>
      ))}
    </svg>
  );
}

function IllFinancial({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* bank base */}
      <rect x="36" y="160" width="208" height="10" rx="2" fill={c} fillOpacity=".5"/>
      <rect x="60" y="90" width="160" height="70" rx="2" fill={c} fillOpacity=".12" stroke={c} strokeWidth="2" strokeOpacity=".45"/>
      {/* columns */}
      {[76,102,128,154,180].map(x=>(
        <rect key={x} x={x} y="90" width="12" height="70" rx="2" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1" strokeOpacity=".35"/>
      ))}
      {/* pediment */}
      <polygon points="48,90 140,32 232,90" fill={c} fillOpacity=".18" stroke={c} strokeWidth="2" strokeOpacity=".5" strokeLinejoin="round"/>
      {/* Naira / currency symbol */}
      <text x="140" y="70" textAnchor="middle" fontSize="26" fontWeight="900" fill={c} fillOpacity=".6" fontFamily={font}>₦</text>
      {/* shield */}
      <path d="M222,24 L246,36 L246,64 Q246,80 222,90 Q198,80 198,64 L198,36 Z" fill={c} fillOpacity=".18" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      <path d="M228,55 L234,62 L244,46" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".7"/>
      {/* bar chart */}
      {[[16,155,32],[36,140,32],[56,120,32],[76,100,32]].map(([x,y,w])=>(
        <rect key={x} x={x} y={y} width={w} height={175-y} rx="2" fill={c} fillOpacity=".3" stroke={c} strokeWidth="1" strokeOpacity=".4"/>
      ))}
      <line x1="10" y1="175" x2="112" y2="175" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
    </svg>
  );
}

function IllLogistics({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* road */}
      <rect x="0" y="148" width="280" height="28" rx="2" fill={c} fillOpacity=".12"/>
      {/* centre dashes */}
      {[20,56,92,128,164,200,236].map(x=><rect key={x} x={x} y="160" width="20" height="4" rx="2" fill={c} fillOpacity=".35"/>)}
      {/* truck body */}
      <rect x="36" y="108" width="120" height="40" rx="4" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2" strokeOpacity=".55"/>
      {/* truck cab */}
      <path d="M156,108 L176,108 L188,124 L188,148 L156,148 Z" fill={c} fillOpacity=".25" stroke={c} strokeWidth="2" strokeOpacity=".55" strokeLinejoin="round"/>
      {/* windshield */}
      <path d="M158,114 L174,114 L182,126 L158,126 Z" fill={c} fillOpacity=".35"/>
      {/* wheels */}
      <circle cx="70" cy="152" r="14" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2.5" strokeOpacity=".6"/>
      <circle cx="70" cy="152" r="6" fill={c} fillOpacity=".5"/>
      <circle cx="160" cy="152" r="14" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2.5" strokeOpacity=".6"/>
      <circle cx="160" cy="152" r="6" fill={c} fillOpacity=".5"/>
      {/* package */}
      <rect x="62" y="116" width="28" height="24" rx="2" fill={c} fillOpacity=".3" stroke={c} strokeWidth="1.5" strokeOpacity=".5"/>
      <line x1="76" y1="116" x2="76" y2="140" stroke={c} strokeWidth="1" strokeOpacity=".4"/>
      <line x1="62" y1="128" x2="90" y2="128" stroke={c} strokeWidth="1" strokeOpacity=".4"/>
      {/* GPS route */}
      <circle cx="220" cy="44" r="16" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      <path d="M220,60 Q220,70 220,80" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity=".45" strokeDasharray="4 4"/>
      <path d="M220,44 Q228,38 220,30 Q212,38 220,44Z" fill={c} fillOpacity=".6"/>
      <circle cx="220" cy="40" r="3" fill="white" fillOpacity=".8"/>
      {/* route dots */}
      {[[234,72],[246,94],[240,116]].map(([x,y])=>(
        <circle key={x} cx={x} cy={y} r="4" fill={c} fillOpacity=".45" stroke={c} strokeWidth="1" strokeOpacity=".4"/>
      ))}
      <polyline points="220,80 234,72 246,94 240,116" stroke={c} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity=".4" fill="none"/>
    </svg>
  );
}

function IllAgriculture({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* sun */}
      <circle cx="222" cy="40" r="22" fill={c} fillOpacity=".25" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      {[0,45,90,135,180,225,270,315].map(a=>{
        const rad=a*Math.PI/180;
        return <line key={a} x1={222+Math.cos(rad)*26} y1={40+Math.sin(rad)*26} x2={222+Math.cos(rad)*36} y2={40+Math.sin(rad)*36} stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeOpacity=".55"/>;
      })}
      {/* field rows (perspective) */}
      {[0,1,2,3,4,5].map(i=>(
        <path key={i} d={`M${20+i*14},180 Q${140},${120+i*8} ${260-i*14},180`} stroke={c} strokeWidth={2.5-i*0.3} fill="none" strokeOpacity={0.5-i*0.06}/>
      ))}
      {/* wheat stalks */}
      {[60,90,120,150,180,210].map((x,i)=>(
        <g key={x}>
          <line x1={x} y1="160" x2={x} y2="96" stroke={c} strokeWidth="2" strokeOpacity=".5" strokeLinecap="round"/>
          <ellipse cx={x} cy="90" rx="7" ry="14" fill={c} fillOpacity=".35" stroke={c} strokeWidth="1.2" strokeOpacity=".45" transform={`rotate(${i%2===0?-8:8},${x},90)`}/>
          <line x1={x} y1="120" x2={x-12} y2="108" stroke={c} strokeWidth="1.5" strokeOpacity=".35" strokeLinecap="round"/>
          <line x1={x} y1="130" x2={x+12} y2="118" stroke={c} strokeWidth="1.5" strokeOpacity=".35" strokeLinecap="round"/>
        </g>
      ))}
      {/* harvest box */}
      <rect x="14" y="146" width="32" height="24" rx="3" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <line x1="14" y1="158" x2="46" y2="158" stroke={c} strokeWidth="1" strokeOpacity=".35"/>
      {/* water droplets */}
      {[[246,118],[260,130],[248,142]].map(([x,y])=>(
        <path key={x} d={`M${x},${y-10} Q${x+7},${y-2} ${x},${y} Q${x-7},${y-2} ${x},${y-10}Z`} fill={c} fillOpacity=".4"/>
      ))}
    </svg>
  );
}

function IllProfessional({ c }) {
  return (
    <svg viewBox="0 0 280 196" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block"}}>
      <rect width="280" height="196" fill={c} fillOpacity=".09"/>
      {/* briefcase */}
      <rect x="80" y="82" width="120" height="88" rx="8" fill={c} fillOpacity=".15" stroke={c} strokeWidth="2.5" strokeOpacity=".55"/>
      <rect x="108" y="68" width="64" height="20" rx="5" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2" strokeOpacity=".5"/>
      <line x1="80" y1="116" x2="200" y2="116" stroke={c} strokeWidth="2" strokeOpacity=".4"/>
      <rect x="128" y="108" width="24" height="16" rx="3" fill={c} fillOpacity=".35" stroke={c} strokeWidth="1.5" strokeOpacity=".5"/>
      {/* briefcase lines */}
      {[132,150].map(y=><line key={y} x1="96" y1={y} x2="184" y2={y} stroke={c} strokeWidth="1.5" strokeOpacity=".25" strokeLinecap="round"/>)}
      {/* scales of justice */}
      <line x1="220" y1="28" x2="220" y2="92" stroke={c} strokeWidth="2" strokeOpacity=".5" strokeLinecap="round"/>
      <line x1="196" y1="44" x2="244" y2="44" stroke={c} strokeWidth="2" strokeOpacity=".55" strokeLinecap="round"/>
      <circle cx="220" cy="26" r="5" fill={c} fillOpacity=".5"/>
      {/* scale pans */}
      <path d="M196,44 Q196,62 208,66 Q220,62 220,44" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <path d="M244,44 Q244,60 232,64 Q220,60 220,44" fill={c} fillOpacity=".2" stroke={c} strokeWidth="1.5" strokeOpacity=".4"/>
      <line x1="204" y1="66" x2="216" y2="66" stroke={c} strokeWidth="1.5" strokeOpacity=".4" strokeLinecap="round"/>
      <line x1="224" y1="64" x2="236" y2="64" stroke={c} strokeWidth="1.5" strokeOpacity=".4" strokeLinecap="round"/>
      {/* certificate */}
      <rect x="16" y="38" width="50" height="64" rx="5" fill={c} fillOpacity=".15" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <line x1="24" y1="60" x2="58" y2="60" stroke={c} strokeWidth="1.5" strokeOpacity=".4" strokeLinecap="round"/>
      <line x1="24" y1="70" x2="58" y2="70" stroke={c} strokeWidth="1.5" strokeOpacity=".3" strokeLinecap="round"/>
      <line x1="24" y1="80" x2="46" y2="80" stroke={c} strokeWidth="1.5" strokeOpacity=".3" strokeLinecap="round"/>
      <circle cx="41" cy="90" r="8" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" strokeOpacity=".45"/>
      <path d="M37,90 L40,93 L46,87" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".7"/>
      {/* network nodes */}
      {[[30,156],[56,140],[30,180],[56,168]].map(([x,y])=>(
        <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.2" strokeOpacity=".4"/>
      ))}
      <line x1="30" y1="156" x2="56" y2="140" stroke={c} strokeWidth="1" strokeOpacity=".3"/>
      <line x1="30" y1="156" x2="30" y2="180" stroke={c} strokeWidth="1" strokeOpacity=".3"/>
      <line x1="56" y1="140" x2="56" y2="168" stroke={c} strokeWidth="1" strokeOpacity=".3"/>
      <line x1="30" y1="180" x2="56" y2="168" stroke={c} strokeWidth="1" strokeOpacity=".3"/>
    </svg>
  );
}

const ILL_MAP = {
  healthcare:    IllHealthcare,
  education:     IllEducation,
  government:    IllGovernment,
  corporate:     IllCorporate,
  manufacturing: IllManufacturing,
  retail:        IllRetail,
  sme:           IllSME,
  ngo:           IllNGO,
  financial:     IllFinancial,
  logistics:     IllLogistics,
  agriculture:   IllAgriculture,
  professional:  IllProfessional,
};

// ─── Industry data ──────────────────────────────────────────────────────────────
const INDUSTRIES = [
  {
    id: "healthcare",
    name: "Healthcare",
    color: "#4F8EF7",
    tagline: "Hospitals, clinics, pharmacies & diagnostic labs",
    challenges: [
      "Paper-based patient records causing delays and medical errors",
      "Disconnected pharmacy, lab, and billing systems across departments",
      "Medical directors relying on end-of-month printed reports to make daily decisions",
      "Manual NHIS/LHIS claims processing causing revenue leakage",
    ],
    solutions: [
      "CareCore AI/Local: 25+ integrated hospital modules in one system",
      "Unified patient journey from OPD registration to final billing",
      "Live executive dashboard with occupancy, revenue, and stock KPIs",
      "Automated NHIS & LHIS claim generation and reconciliation",
    ],
    products: ["CareCore AI", "CareCore Local", "InventoryCore"],
    page: "carecore",
  },
  {
    id: "education",
    name: "Education",
    color: "#F59E0B",
    tagline: "Schools, universities & vocational institutions",
    challenges: [
      "Admissions, fees, results, and attendance managed in separate spreadsheets",
      "Parents have no real-time visibility into their child's academic progress",
      "Manual result computation creating errors and delays at the end of term",
      "Fee defaulters go untracked until term end, creating cash flow pressure",
    ],
    solutions: [
      "SchoolCore: one platform for academics, finance, staff, and parents",
      "Parent portal with real-time result, attendance, and fee access",
      "WAEC/NECO result format auto-generated from continuous assessment",
      "Automated fee reminder system with payment reconciliation",
    ],
    products: ["SchoolCore", "FinanceCore", "HRCore"],
    page: "schoolcore",
  },
  {
    id: "government",
    name: "Government",
    color: "#F43F5E",
    tagline: "Public agencies, MDAs & civil service bodies",
    challenges: [
      "Fragmented records across departments making audits painful and slow",
      "Payroll irregularities, ghost workers, and untracked staff leave",
      "No central compliance tracker for statutory deadlines and filings",
      "Donor and budget reporting relies on ad-hoc spreadsheets",
    ],
    solutions: [
      "HRCore: staff records, payroll, and biometric attendance in one place",
      "FinanceCore: budget management and transparent expenditure tracking",
      "ComplianceCore: statutory calendar, policy register, and full audit trail",
      "Expenditure reports generated on demand, not assembled the week before audit",
    ],
    products: ["HRCore", "FinanceCore", "ComplianceCore"],
    page: "solutions",
  },
  {
    id: "corporate",
    name: "Corporate Organizations",
    color: "#C8A850",
    tagline: "Holding companies, conglomerates & large enterprises",
    challenges: [
      "No single view of KPIs across multiple subsidiaries or business units",
      "HR, finance, and compliance data living in separate disconnected tools",
      "Board reporting requires days of consolidation across departments",
      "Scaling the workforce without visibility into headcount costs",
    ],
    solutions: [
      "Directors' Portal: consolidated executive dashboard across all units",
      "HRCore + FinanceCore: integrated staff and financial management",
      "ComplianceCore: enterprise-wide policy and risk governance",
      "Automated board packs with live KPI snapshots",
    ],
    products: ["Directors' Portal", "HRCore", "FinanceCore"],
    page: "contact",
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    color: "#EF4444",
    tagline: "Factories, production lines & FMCG companies",
    challenges: [
      "Raw material shortages discovered at the production line, not before procurement",
      "Manual production costing causing inaccurate profitability reporting",
      "Unplanned equipment downtime due to reactive (not scheduled) maintenance",
      "Staff attendance and shift management tracked on paper",
    ],
    solutions: [
      "InventoryCore: raw material, WIP, and finished goods tracking in real time",
      "FinanceCore: production cost allocation and gross margin reporting",
      "Maintenance scheduling module with downtime alerts and service logs",
      "HRCore: shift management, attendance, and factory floor payroll",
    ],
    products: ["InventoryCore", "FinanceCore", "HRCore"],
    page: "inventorycore",
  },
  {
    id: "retail",
    name: "Retail",
    color: "#8B5CF6",
    tagline: "Shops, supermarkets, e-commerce & multi-branch retail",
    challenges: [
      "Stock discrepancies between branches with no central inventory view",
      "Manual point-of-sale records making end-of-day reconciliation slow",
      "Supplier invoices and payment terms managed in spreadsheets",
      "No expiry or batch tracking for perishables and regulated goods",
    ],
    solutions: [
      "InventoryCore: multi-branch real-time stock with barcode and QR scanning",
      "Automated reorder alerts when stock falls below thresholds",
      "Supplier management with purchase order and payment tracking",
      "Batch and expiry management with automated near-expiry alerts",
    ],
    products: ["InventoryCore", "FinanceCore"],
    page: "inventorycore",
  },
  {
    id: "sme",
    name: "SMEs",
    color: "#06B6D4",
    tagline: "Growing businesses & owner-managed companies",
    challenges: [
      "Business owners spending 50%+ of their time on administrative tasks",
      "No clear financial reporting to guide growth or secure financing",
      "Staff leave, payroll, and records tracked informally",
      "Difficulty scaling without repeatable operational processes",
    ],
    solutions: [
      "FinanceCore: invoicing, accounts, and PAYE/VAT compliance built in",
      "HRCore: leave, attendance, and payroll from ₦5,000/month",
      "InventoryCore: stock control for product-based SMEs",
      "Orion Soft Custom: bespoke software and websites built to your budget",
    ],
    products: ["FinanceCore", "HRCore", "InventoryCore"],
    page: "contact",
  },
  {
    id: "ngo",
    name: "NGOs",
    color: "#10B981",
    tagline: "International NGOs, foundations & development organisations",
    challenges: [
      "Donor reporting requires manual data extraction from multiple sources",
      "Beneficiary tracking done in spreadsheets with no single source of truth",
      "Financial compliance across multiple donor-restricted budgets",
      "Project activity logs and staff timesheets managed separately",
    ],
    solutions: [
      "FinanceCore: multi-project budget tracking with donor fund segregation",
      "HRCore: staff contracts, timesheets, and project allocation records",
      "ComplianceCore: policy management and audit documentation",
      "Beneficiary records, visit logs, and outcome data in a single tracked system",
    ],
    products: ["FinanceCore", "HRCore", "ComplianceCore"],
    page: "solutions",
  },
  {
    id: "financial",
    name: "Financial Services",
    color: "#C8A850",
    tagline: "Banks, microfinance, fintech, insurance & professional services",
    challenges: [
      "CBN, NDPR, and FIRS compliance managed reactively rather than proactively",
      "Manual KYC and regulatory documentation creating compliance risk",
      "No automated audit trail across customer accounts and transactions",
      "PAYE, pension, and statutory filings often late or inaccurate",
    ],
    solutions: [
      "ComplianceCore: Nigerian regulatory calendar for CBN, NDPR, CAC, FIRS",
      "Automated policy review cycles with sign-off workflow and document control",
      "Full audit trail with role-based access and exception alerts",
      "FinanceCore: PAYE, WHT, VAT, and NHF calculation built in",
    ],
    products: ["ComplianceCore", "FinanceCore", "HRCore"],
    page: "compliancecore",
  },
  {
    id: "logistics",
    name: "Logistics",
    color: "#0EA5E9",
    tagline: "Haulage, courier, last-mile & fleet operators",
    challenges: [
      "No live vehicle tracking or trip assignment system for dispatchers",
      "Fuel purchases and maintenance expenses tracked informally",
      "Driver licence, vehicle papers, and insurance expiry not monitored",
      "Revenue and profitability per route or vehicle unknown",
    ],
    solutions: [
      "FleetCore: vehicle registry, driver records, and trip management",
      "Fuel consumption tracking with variance alerts per vehicle",
      "Document expiry calendar licence, insurance, roadworthiness reminders",
      "Per-route profitability reporting with fuel cost allocation",
    ],
    products: ["FleetCore", "InventoryCore"],
    page: "solutions",
  },
  {
    id: "agriculture",
    name: "Agriculture",
    color: "#22C55E",
    tagline: "Farms, agri-processors, food manufacturers & cooperatives",
    challenges: [
      "Farm input costs and yield records kept in notebooks or not at all",
      "No traceability from raw material intake to finished product or sale",
      "Cooperative member contributions and loan records poorly documented",
      "Seasonal cash flow pressures with no financial forecasting tools",
    ],
    solutions: [
      "InventoryCore: input tracking from purchase to farm use and harvest yield",
      "FinanceCore: farm budgets, seasonal cash flow, and cooperative accounts",
      "Batch tracking for agri-processing with full traceability to source",
      "Custom reporting for donor-funded farm programmes and cooperatives",
    ],
    products: ["InventoryCore", "FinanceCore"],
    page: "contact",
  },
  {
    id: "professional",
    name: "Professional Services",
    color: "#6366F1",
    tagline: "Law firms, consulting firms, accounting practices & IT companies",
    challenges: [
      "Billable hours and client project costs tracked manually across engagements",
      "Staff utilisation and profitability per engagement unknown",
      "HR and leave management handled informally as headcount grows",
      "No structured compliance or risk management framework in place",
    ],
    solutions: [
      "HRCore: staff records, leave, appraisals, and billable time tracking",
      "FinanceCore: engagement-level invoicing, profitability, and PAYE",
      "ComplianceCore: regulatory tracking for licensed professional bodies",
      "Custom client portal and project management tools built to spec",
    ],
    products: ["HRCore", "FinanceCore", "ComplianceCore"],
    page: "contact",
  },
];

// ─── Industry Card ──────────────────────────────────────────────────────────────
function IndustryCard({ ind, setCurrentPage }) {
  const [hov, setHov] = useState(false);
  const Ill = ILL_MAP[ind.id];

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.bg,
        border: `1.5px solid ${hov ? ind.color + "44" : T.border}`,
        borderRadius: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: hov
          ? `0 20px 64px ${ind.color}18, 0 4px 16px rgba(6,24,40,0.08)`
          : "0 2px 12px rgba(6,24,40,0.05)",
        transform: hov ? "translateY(-7px)" : "none",
        transition: "all 0.34s cubic-bezier(0.16,1,0.3,1)",
        cursor: "default",
      }}>

      {/* Illustration */}
      <div style={{
        height: 196,
        background: `linear-gradient(135deg, ${ind.color}0C, ${ind.color}1E)`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.34s ease",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          transform: hov ? "scale(1.04)" : "scale(1)",
          transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {Ill && <Ill c={ind.color}/>}
        </div>
        {/* top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: ind.color }}/>
        {/* category badge */}
        <div style={{ position: "absolute", bottom: 12, left: 14 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 800, color: ind.color,
            background: `${ind.color}14`, backdropFilter: "blur(8px)",
            border: `1px solid ${ind.color}30`, borderRadius: 6,
            padding: "4px 10px", fontFamily: font, letterSpacing: "0.06em",
          }}>
            {ind.tagline.split(",")[0].split("&")[0].trim().toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "22px 22px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 19, fontWeight: 900, color: T.navy, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 4px" }}>{ind.name}</h3>
        <p style={{ fontSize: 12.5, color: T.muted, fontFamily: font, margin: "0 0 18px", lineHeight: 1.5 }}>{ind.tagline}</p>

        {/* Challenges */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.muted, fontFamily: font, letterSpacing: "0.12em", marginBottom: 8 }}>INDUSTRY CHALLENGES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ind.challenges.slice(0, 3).map(c => (
              <div key={c} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M2 2l6 6" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </span>
                <span style={{ fontSize: 12.5, color: T.textSub, fontFamily: font, lineHeight: 1.55 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Solutions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: ind.color, fontFamily: font, letterSpacing: "0.12em", marginBottom: 8 }}>HOW WE SOLVE IT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ind.solutions.slice(0, 3).map(s => (
              <div key={s} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: `${ind.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.5l2.5 2.5 5-5" stroke={ind.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span style={{ fontSize: 12.5, color: T.textSub, fontFamily: font, lineHeight: 1.55 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Products strip */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
          {ind.products.map(p => (
            <span key={p} style={{
              fontSize: 11, fontWeight: 700, color: ind.color,
              background: `${ind.color}10`, border: `1px solid ${ind.color}22`,
              borderRadius: 5, padding: "3px 9px", fontFamily: font,
            }}>{p}</span>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => setCurrentPage(ind.page)}
          onMouseEnter={e => { e.currentTarget.style.background = ind.color; e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.borderColor = ind.color; e.currentTarget.style.boxShadow = `0 8px 28px ${ind.color}40`; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ind.color; e.currentTarget.style.borderColor = `${ind.color}40`; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
          style={{
            background: "transparent",
            color: ind.color,
            border: `1.5px solid ${ind.color}40`,
            borderRadius: 10,
            padding: "11px 18px",
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: font,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
            marginTop: "auto",
          }}>
          Explore Solutions
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function IndustriesPage({ setCurrentPage }) {
  return (
    <div style={{ background: T.bg, overflowX: "hidden" }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ background: T.bgDark, padding: "120px clamp(24px,5vw,80px) 100px", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: "-20%", right: "-5%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,168,80,0.08) 0%, transparent 65%)" }}/>
        <div aria-hidden="true" style={{ position: "absolute", bottom: "-20%", left: "-5%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 65%)" }}/>
        <div style={{ maxWidth: 1360, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,100px)", alignItems: "center" }} className="intro-grid">
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, fontFamily: font, letterSpacing: "0.14em", marginBottom: 18 }}>INDUSTRIES WE SERVE</div>
              <h1 style={{ fontSize: "clamp(36px,5vw,68px)", fontWeight: 900, color: "#F2F6FF", fontFamily: font, lineHeight: 1.04, letterSpacing: "-0.04em", margin: "0 0 20px" }}>
                Software shaped<br/>to your sector.
              </h1>
              <p style={{ fontSize: 17, color: "rgba(200,210,226,0.75)", fontFamily: font, lineHeight: 1.82, margin: "0 0 36px", maxWidth: 480 }}>
                Every industry has its own pressures, regulations, and workflows. Orion Soft builds platforms that understand your sector not generic software you have to force-fit.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setCurrentPage("contact")}
                  style={{ background: T.gold, color: "#06100E", border: "none", borderRadius: 11, padding: "14px 28px", fontSize: 15, fontWeight: 800, fontFamily: font, cursor: "pointer", boxShadow: "0 6px 28px rgba(200,168,80,0.35)", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; }}>
                  Book a Consultation →
                </button>
                <button type="button" onClick={() => setCurrentPage("products")}
                  style={{ background: "rgba(255,255,255,0.07)", color: "#F2F6FF", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "14px 28px", fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}>
                  View our products
                </button>
              </div>
            </div>
            {/* Right: stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { v: "12", l: "Industries\ncovered", color: "#4F8EF7" },
                { v: "9+", l: "Dedicated\nplatforms", color: "#C8A850" },
                { v: "25+", l: "Modules across\nthe product suite", color: "#10B981" },
                { v: "100%", l: "Nigerian\nregulation built in", color: "#F43F5E" },
              ].map(s => (
                <div key={s.l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 20px" }}>
                  <div style={{ fontSize: "clamp(28px,3.5vw,42px)", fontWeight: 900, color: s.color, fontFamily: font, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{s.v}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(200,210,226,0.5)", fontFamily: font, lineHeight: 1.45, whiteSpace: "pre-line" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Industry cards grid ────────────────────────────────────────────── */}
      <section style={{ padding: "100px clamp(24px,5vw,80px) 120px", background: T.bgAlt }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2 style={{ fontSize: "clamp(28px,3.2vw,44px)", fontWeight: 900, color: T.navy, fontFamily: font, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
                12 industries. One engineering standard.
              </h2>
              <p style={{ fontSize: 16.5, color: T.textSub, fontFamily: font, maxWidth: 520, margin: "0 auto" }}>
                Hover a card to see the challenges we solve and the products we deploy in each sector.
              </p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }} className="industries-cards-grid">
            {INDUSTRIES.map((ind, i) => (
              <Reveal key={ind.id} delay={Math.min((i % 3) * 0.06, 0.18)}>
                <IndustryCard ind={ind} setCurrentPage={setCurrentPage}/>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section style={{ background: T.bgDark, padding: "88px clamp(24px,5vw,80px)" }}>
        <Reveal>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, fontFamily: font, letterSpacing: "0.14em", marginBottom: 16 }}>NOT SURE WHERE TO START?</div>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 900, color: "#F2F6FF", fontFamily: font, letterSpacing: "-0.03em", lineHeight: 1.06, margin: "0 0 16px" }}>
              Tell us about your business.
            </h2>
            <p style={{ fontSize: 16.5, color: "rgba(200,210,226,0.7)", fontFamily: font, lineHeight: 1.8, margin: "0 0 36px" }}>
              We'll listen to how you work, understand what's slowing you down, and recommend exactly the right product or build something custom. No generic demos.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentPage("contact")}
                style={{ background: T.gold, color: "#06100E", border: "none", borderRadius: 11, padding: "15px 32px", fontSize: 15.5, fontWeight: 800, fontFamily: font, cursor: "pointer", boxShadow: "0 6px 28px rgba(200,168,80,0.35)", transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(200,168,80,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 28px rgba(200,168,80,0.35)"; }}>
                Book a Free Consultation →
              </button>
              <button type="button" onClick={() => setCurrentPage("products")}
                style={{ background: "transparent", color: "#F2F6FF", border: "1.5px solid rgba(255,255,255,0.18)", borderRadius: 11, padding: "15px 32px", fontSize: 15.5, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}>
                Browse all products
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
