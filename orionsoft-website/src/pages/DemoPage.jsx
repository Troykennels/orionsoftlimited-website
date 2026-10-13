// Product tour videos on pages of their own: /demo (CareCore) and
// /staffcore-demo. A watch page with the video as its main content lets Google
// list it in video results (prerender-seo.mjs adds its VideoObject, the
// sitemap its video entry), and gives us one link to share.
import { useEffect } from 'react'
import { BRAND } from '../lib/brand.js'
import { DEMO_VIDEO, STAFFCORE_VIDEO } from '../../shared/demoVideo.js'

const C = {
  bg: '#060810', card: '#0F1828', border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.16)',
  heading: '#F2F6FF', text: '#C8D0E0', textMuted: '#7D8BA6', gold: BRAND.gold,
}
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif"

const TOURS = {
  carecore: {
    video: DEMO_VIDEO, length: '3 minutes', pageTitle: 'CareCore HMS Demo Video: Product Tour | Orion Soft',
    product: 'carecore', productLabel: 'CareCore features and pricing',
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
}

function WatchPage({ tour, setCurrentPage }) {
  const { video } = tour
  useEffect(() => { document.title = tour.pageTitle }, [tour])
  const go = (e, page) => { e.preventDefault(); setCurrentPage(page) }

  return (
    <main id="main-content" style={{ background: C.bg, minHeight: '100vh', padding: '110px 16px 80px', fontFamily: font }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, marginBottom: 10 }}>Product tour · {tour.length}</div>
        <h1 style={{ color: C.heading, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.15, margin: '0 0 14px', fontWeight: 800 }}>{video.title}</h1>
        <p style={{ color: C.text, fontSize: 17, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 760 }}>{video.description}</p>

        <div style={{ background: '#FFC533', borderRadius: 22, padding: 'clamp(8px, 2.4vw, 22px)' }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '3px solid #0B1B3A', boxShadow: '0 20px 50px rgba(11,27,58,0.35)', background: '#07111D' }}>
            <video controls playsInline preload="metadata" poster={video.thumbnail} aria-label={video.title}
              style={{ width: '100%', aspectRatio: '16 / 9', display: 'block' }}>
              <source src={video.src} type="video/mp4" />
            </video>
          </div>
        </div>

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
