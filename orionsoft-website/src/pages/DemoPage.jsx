// Product tour videos on pages of their own: /demo and /carecore-demo (CareCore),
// /staffcore-demo, and /schoolcore-demo and /compliancecore-demo (an overview plus a playlist of parts). A watch page with the video as its main content lets Google
// list it in video results (prerender-seo.mjs adds its VideoObject, the
// sitemap its video entry), and gives us one link to share.
import { useEffect, useRef, useState } from 'react'
import { BRAND } from '../lib/brand.js'
import { DEMO_VIDEO, CARECORE_VIDEO, STAFFCORE_VIDEO, SCHOOLCORE_VIDEO, COMPLIANCECORE_VIDEO, ORIONCRM_VIDEO, DIRECTORS_VIDEO, LICENSE_VIDEO } from '../../shared/demoVideo.js'

const C = {
  bg: '#060810', card: '#0F1828', border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.16)',
  heading: '#F2F6FF', text: '#C8D0E0', textMuted: '#7D8BA6', gold: BRAND.gold,
}
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif"

const TOURS = {
  carecore: {
    video: DEMO_VIDEO, length: '3 minutes', pageTitle: 'CareCore HMS Demo Video: Product Tour | Orion Soft',
    product: 'carecore', productLabel: 'CareCore features and pricing', panel: '#05070B', frame: '#1C2433',
    chapters: [
      ['Dashboard', 'Patients, visits, bed occupancy, stock alerts, unpaid invoices and pending lab work at a glance.'],
      ['Registration and consultation', 'One accurate patient profile shared by every department, with clinical notes and care plans.'],
      ['Pharmacy', 'Prescriptions, dispensing and stock visibility connected to billing.'],
      ['Laboratory', 'Requests and results linked to the clinical record, with no paper forms to chase.'],
      ['Billing and nursing', 'Charges, receipts, balances and HMO schemes; vitals, notes and handovers.'],
      ['Reports', 'Trends across patients, services, payments, stock and departments.'],
    ],
    closing: <>CareCore is built by Orion Soft Limited in Lagos, Nigeria, and runs on the web, on Android and iOS, and as an offline local server for hospitals with unreliable internet.
      Want to see it with your own hospital's workflow?</>,
  },
  carecoreAd: {
    video: CARECORE_VIDEO, length: '3 minutes', pageTitle: 'CareCore Demo Video: Is Your Hospital Losing Money? | Orion Soft',
    product: 'carecore', productLabel: 'CareCore features', panel: '#BFE3FF',
    chapters: [
      ['One record per patient', 'Reception is warned the moment a patient who is already registered is typed in again.'],
      ['AI at triage', 'The nurse types or speaks one sentence; CareCore fills in every vital sign and scores the patient.'],
      ['Critical alerts', 'A red emergency reaches every doctor on duty, and keeps chasing until someone acknowledges it.'],
      ['Safer prescribing', 'Allergies are checked by drug family, and stock is shown before the patient leaves the doctor.'],
      ['No revenue leaks', 'Consultation, tests and drugs are billed by themselves; nobody can charge below the price list or delete a paid bill.'],
      ["The owner's view", "HMO and NHIA claims, today's money, debtors and every bed, from anywhere."],
    ],
    closing: <>CareCore is built by Orion Soft Limited in Lagos, Nigeria. The video shows a demo hospital with made-up patients and staff.
      Want to see it set up for your hospital?</>,
  },
  staffcore: {
    video: STAFFCORE_VIDEO, length: `${Math.round(STAFFCORE_VIDEO.seconds / 60)} minutes`, pageTitle: 'StaffCore Demo Video: Know Who Is Really at Work | Orion Soft',
    product: 'staffcore', productLabel: 'StaffCore features',
    chapters: [
      ['Clock in on the phone', 'A staff member chooses where they are working and starts their day. Time and exact location are saved, so nobody signs in for a friend.'],
      ['Clear about privacy', 'Location is recorded only at clock-in and client visits, never in the background.'],
      ['Stand-up and field visits', 'A daily plan for the manager, and a GPS check-in with a live photo at every client.'],
      ['Tasks, leave and expenses', 'Work with due dates, leave requests and expense claims, all from the phone.'],
      ['The manager\'s live view', 'Who is at work and where, location checks, a map of clock-ins, and one-click approvals.'],
      ['Performance and queries', 'Scores built from verified activity, and formal queries kept on record.'],
    ],
    closing: <>StaffCore is the portal Orion Soft's own team works in every day. The video shows a demo company with made-up staff.
      Want to see it set up for your organisation?</>,
  },
  schoolcore: {
    video: SCHOOLCORE_VIDEO, length: '2 minutes, then 8 short parts', pageTitle: 'SchoolCore Demo Videos: School Management Software Tour | Orion Soft',
    product: 'schoolcore', productLabel: 'SchoolCore features', panel: '#103A2E', frame: '#0A271E',
    chapters: [
      ['Fees', 'See who owes, to the last naira, and remind parents without lifting a finger.'],
      ['Teachers', 'Who came, who is teaching, and tests that mark themselves.'],
      ['Child safety', 'Pick-up codes at the gate: no code, no child.'],
      ['Report cards', 'Scores entered once; totals, positions and report cards work themselves out.'],
      ['Parents', 'Results, fees and payments on the parent\'s own phone.'],
      ['The principal', 'The whole school on one dashboard before morning assembly.'],
    ],
    closing: <>SchoolCore is built by Orion Soft Limited in Lagos, Nigeria, for Nigerian schools. The videos show a demo school with made-up pupils and staff.
      Want to see it set up for your school?</>,
  },
  compliancecore: {
    video: COMPLIANCECORE_VIDEO, length: '2 minutes, then 5 short parts', pageTitle: 'ComplianceCore Demo Videos: Compliance Management Software Tour | Orion Soft',
    product: 'compliancecore', productLabel: 'ComplianceCore features', panel: '#103A2E', frame: '#0A271E',
    chapters: [
      ['Which rules apply', 'Plain questions in, and a clear, defensible list of the frameworks that apply to you.'],
      ['Your real score', 'One honest compliance score, an owner for every control, and proof ready before it is asked for.'],
      ['Policies and risks', 'Policies approved in the right order, signed and tamper-evident; risks and suppliers under control.'],
      ['The 72-hour clock', 'Breaches flagged the moment you know, with every step recorded and nothing edited later.'],
      ["Everyone's job", "Clear tasks and owners, ignored work that escalates itself, and a board pack in one click."],
      ['Nothing expires unnoticed', 'Certificates and supplier contracts are tracked, so none lapses without warning.'],
    ],
    closing: <>ComplianceCore is built by Orion Soft Limited in Lagos, Nigeria. The videos show a demo company with made-up data.
      Want to see it set up for your organisation?</>,
  },
  orioncrm: {
    video: ORIONCRM_VIDEO, length: "2 minutes, then 5 short parts", pageTitle: "Orion CRM Demo Videos: Sales, Billing and Customer Success CRM | Orion Soft",
    product: "products", productLabel: "All Orion Soft products", panel: "#103A2E", frame: "#0A271E",
    chapters: [
      ["Never lose a lead", "Every enquiry captured and scored, one pipeline for the whole team, and the deals to chase first."],
      ["Demos to signed deals", "Demos booked and debriefed, proposals that show when they are read, one price list for every quote."],
      ["Get paid on time", "Invoices with VAT and part payments, subscriptions and renewals that never slip, contracts that never quietly expire."],
      ["Keep every customer", "Account health from real signals, renewals flagged months ahead, support tickets with deadlines."],
      ["Run the sales team", "Each person's day planned for them, targets measured on money received, commission worked out and approved."],
      ["Your data is yours", "Built in Nigeria for growing teams, with your records kept under your control."],
    ],
    closing: <>Orion CRM is built by Orion Soft Limited in Lagos, Nigeria. The videos show a demo company with made-up customers.
      Want to see it set up for your sales team?</>,
  },
  directors: {
    video: DIRECTORS_VIDEO, length: "2 minutes", pageTitle: "Directors' Portal Demo Video: Board Governance Software | Orion Soft",
    product: "products", productLabel: "All Orion Soft products", panel: "#103A2E", frame: "#0A271E",
    chapters: [
      ["Board meetings", "Every board and committee meeting, with a clear agenda, timings and presenters."],
      ["Board packs", "Secure, versioned board papers, always current, never lost in email."],
      ["Minutes", "Minutes reviewed and approved online, with comments in one place."],
      ["Resolutions", "Resolutions proposed and voted on, with quorum checked automatically."],
      ["Committees", "Audit, nomination, remuneration and risk committees, each with its own quorum."],
      ["Audit trail", "A full record of who did what, and when."],
    ],
    closing: <>The Directors' Portal is built by Orion Soft Limited in Lagos, Nigeria. The video shows a demo company with made-up directors.
      Want to see it set up for your board?</>,
  },
  license: {
    video: LICENSE_VIDEO, length: "3 minutes", pageTitle: "Orion License Manager Demo Video: Software Licensing and Activation | Orion Soft",
    product: "products", productLabel: "All Orion Soft products", panel: "#103A2E", frame: "#0A271E",
    chapters: [
      ["Issue licences", "Signed licence keys issued in seconds, with seats, grace period and expiry."],
      ["Every installed copy", "See every machine running your software, live, and release a seat when needed."],
      ["One catalogue", "Every product and edition in one place."],
      ["Renewals and invoices", "Expiring licences flagged, renewals and invoices that never slip."],
      ["What is selling", "Licences by product and status at a glance."],
      ["Control", "Suspend or revoke a licence the moment it is misused."],
    ],
    closing: <>Orion License Manager is built by Orion Soft Limited in Lagos, Nigeria. The video shows made-up customers and machines.
      Selling software of your own and want licensing like this?</>,
  },
}

function WatchPage({ tour, setCurrentPage }) {
  const { video } = tour
  // With a playlist, the player shows whichever video was picked: null is the
  // main one, otherwise a part.
  const [part, setPart] = useState(null)
  const player = useRef(null)
  const picked = useRef(false)
  const now = part || video
  useEffect(() => { document.title = tour.pageTitle }, [tour])
  useEffect(() => {
    if (!picked.current) return
    player.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    player.current?.play?.().catch(() => { /* the visitor can press play */ })
  }, [part])
  const pick = p => { picked.current = true; setPart(p) }
  const go = (e, page) => { e.preventDefault(); setCurrentPage(page) }

  return (
    <main id="main-content" style={{ background: C.bg, minHeight: '100vh', padding: '110px 16px 80px', fontFamily: font }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, marginBottom: 10 }}>Product tour · {tour.length}</div>
        <h1 style={{ color: C.heading, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.15, margin: '0 0 14px', fontWeight: 800 }}>{video.title}</h1>
        <p style={{ color: C.text, fontSize: 17, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 760 }}>{video.description}</p>

        <div style={{ background: tour.panel || '#FFC533', borderRadius: 22, padding: 'clamp(8px, 2.4vw, 22px)' }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: `3px solid ${tour.frame || '#0B1B3A'}`, boxShadow: '0 20px 50px rgba(11,27,58,0.35)', background: '#07111D' }}>
            <video key={now.src} ref={player} controls playsInline preload="metadata" poster={now.thumbnail} aria-label={now.title}
              style={{ width: '100%', aspectRatio: '16 / 9', display: 'block' }}>
              <source src={now.src} type="video/mp4" />
            </video>
          </div>
        </div>

        {video.parts && (
          <section aria-label="All videos" style={{ marginTop: 26 }}>
            <div style={{ color: C.heading, fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>
              Now playing: {part ? `Part ${part.n} of ${video.parts.length}: ${part.title}` : 'The 2-minute overview'}
            </div>
            <div style={{ color: C.textMuted, fontSize: 14, margin: '0 0 16px' }}>Start with the overview, then pick the part that matters most to you.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
              {[null, ...video.parts].map(p => {
                const item = p || video
                const active = (p?.n || 0) === (part?.n || 0)
                return (
                  <button key={p?.n || 0} type="button" onClick={() => pick(p)} aria-pressed={active}
                    style={{ textAlign: 'left', padding: 0, background: C.card, border: `2px solid ${active ? C.gold : C.border}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', fontFamily: font }}>
                    <img src={item.thumbnail} alt="" loading="lazy" width="640" height="360" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    <span style={{ display: 'block', padding: '12px 14px 14px' }}>
                      <span style={{ display: 'block', color: C.gold, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                        {p ? `Part ${p.n} · ${p.length}` : `Start here · ${video.overview.length}`}
                      </span>
                      <span style={{ display: 'block', color: C.heading, fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{p ? p.title : video.overview.label}</span>
                      <span style={{ display: 'block', color: C.textMuted, fontSize: 13, marginTop: 4 }}>{p ? p.about : video.overview.about}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '28px 0 44px' }}>
          <a href="/consultation" onClick={e => go(e, 'consultation')}
            style={{ background: C.gold, color: '#0B0F18', borderRadius: 11, padding: '14px 24px', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            Book a free live demo
          </a>
          <a href={`/${tour.product}`} onClick={e => go(e, tour.product)}
            style={{ background: 'rgba(255,255,255,0.08)', color: C.heading, border: `1px solid ${C.borderStrong}`, borderRadius: 11, padding: '14px 24px', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            {tour.productLabel}
          </a>
        </div>

        <h2 style={{ color: C.heading, fontSize: 24, margin: '0 0 16px' }}>What the tour covers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {tour.chapters.map(([t, d]) => (
            <div key={t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ color: C.heading, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t}</div>
              <div style={{ color: C.textMuted, fontSize: 14.5, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>

        <p style={{ color: C.textMuted, fontSize: 14.5, lineHeight: 1.6, marginTop: 36 }}>
          {tour.closing} Call or WhatsApp <a href="https://wa.me/2348169577059" style={{ color: C.gold }}>0816 957 7059</a>.
        </p>
      </div>
    </main>
  )
}

export default function DemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.carecore} setCurrentPage={setCurrentPage} />
}
export function StaffCoreDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.staffcore} setCurrentPage={setCurrentPage} />
}
export function SchoolCoreDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.schoolcore} setCurrentPage={setCurrentPage} />
}
export function CareCoreDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.carecoreAd} setCurrentPage={setCurrentPage} />
}
export function ComplianceCoreDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.compliancecore} setCurrentPage={setCurrentPage} />
}
export function OrionCrmDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.orioncrm} setCurrentPage={setCurrentPage} />
}
export function DirectorsDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.directors} setCurrentPage={setCurrentPage} />
}
export function LicenseDemoPage({ setCurrentPage }) {
  return <WatchPage tour={TOURS.license} setCurrentPage={setCurrentPage} />
}
