// Free take-home pay calculators for Kenya and Ghana (Nigeria's is in
// ToolsPages.jsx). Same idea: people search for them, share their results
// and embed them, which brings Orion Soft visitors from beyond Nigeria.
//   /kenya-paye-calculator   /ghana-paye-calculator   (?embed=1 for other sites)
import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '../lib/brand.js'
import { kenyaPay, ghanaPay } from '../../shared/payrollAfrica.js'
import { SHARE_TARGETS, openShare } from '../staff/api.js'
import { KENYA_FAQS, GHANA_FAQS } from '../lib/africaPayeFaqs.js'

const C = {
  bg: '#060810', surface: '#0B1120', card: '#0F1828', raised: '#14203A',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.16)',
  heading: '#F2F6FF', text: '#C8D0E0', textMuted: '#7D8BA6',
  gold: BRAND.gold, mint: '#10B981', mintDim: 'rgba(16,185,129,0.12)',
}
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif"
const SITE = 'https://www.orionsoftlimited.com'
const digits = s => Number(String(s).replace(/[^\d.]/g, '')) || 0

const COUNTRIES = {
  ke: {
    path: '/kenya-paye-calculator', name: 'Kenya', symbol: 'KSh', locale: 'en-KE', compute: kenyaPay, faqs: KENYA_FAQS,
    defaultSalary: 100000, law: 'KRA rates for 2026, NSSF from February 2026 and the Tax Laws (Amendment) Act 2024',
    title: 'Kenya PAYE Calculator 2026: Net Pay After NSSF, SHIF & Housing Levy',
    h1: 'Kenya PAYE & Net Pay Calculator 2026',
    intro: 'See your PAYE, NSSF, SHIF, Housing Levy and take-home pay in seconds. Updated for the 2026 NSSF rates and the rule that SHIF and the Housing Levy come off your pay before tax.',
    note: 'SHIF and the Housing Levy are deducted before PAYE (since 27 December 2024), so your tax is lower than on calculators that still tax your full gross pay.',
  },
  gh: {
    path: '/ghana-paye-calculator', name: 'Ghana', symbol: 'GH₵', locale: 'en-GH', compute: ghanaPay, faqs: GHANA_FAQS,
    defaultSalary: 5000, law: 'GRA resident rates effective 1 September 2026',
    title: 'Ghana PAYE Calculator 2026: Net Salary After SSNIT & Income Tax',
    h1: 'Ghana PAYE & Net Salary Calculator 2026',
    intro: 'See your income tax, SSNIT and take-home pay under the GRA rates that took effect on 1 September 2026, with a band-by-band breakdown.',
    note: 'SSNIT (5.5%) and any provident fund contribution are worked out on your basic salary and deducted before PAYE.',
  },
}

function Field({ id, label, value, onChange, symbol, hint }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: font }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontFamily: font, fontSize: 14 }}>{symbol}</span>
        <input id={id} inputMode="numeric" value={value ? Math.round(value).toLocaleString('en-US') : ''} onChange={e => onChange(digits(e.target.value))} placeholder="0"
          style={{ width: '100%', boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: `13px 14px 13px ${symbol.length > 2 ? 52 : 40}px`, color: C.heading, fontSize: 18, fontWeight: 700, fontFamily: font, outline: 'none' }} />
      </div>
      {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5, fontFamily: font }}>{hint}</div>}
    </div>
  )
}

function CountryPayePage({ code, setCurrentPage }) {
  const cfg = COUNTRIES[code]
  const embed = new URLSearchParams(window.location.search).has('embed')
  const q = new URLSearchParams(window.location.search)
  const [period, setPeriod] = useState(q.get('period') === 'annual' ? 'annual' : 'monthly')
  const [salary, setSalary] = useState(() => Number(q.get('salary')) || cfg.defaultSalary)
  const [basic, setBasic] = useState(() => Number(q.get('basic')) || 0)
  const [provident, setProvident] = useState(() => Math.min(16.5, Number(q.get('provident')) || 0))
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => { if (!embed) document.title = `${cfg.title} | Orion Soft` }, [embed, cfg.title])

  const monthly = period === 'annual' ? salary / 12 : salary
  const r = useMemo(() => cfg.compute(monthly, code === 'gh' ? { basic: basic ? (period === 'annual' ? basic / 12 : basic) : undefined, providentPct: provident } : {}), [cfg, monthly, basic, provident, period, code])
  const money = n => `${cfg.symbol} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`

  const shareLink = `${SITE}${cfg.path}`
  const shareText = `Free ${cfg.name} PAYE calculator for 2026: see your tax and take-home pay in seconds.`
  const embedCode = `<iframe src="${SITE}${cfg.path}?embed=1" title="${cfg.name} PAYE calculator 2026" style="width:100%;max-width:720px;height:720px;border:0;border-radius:16px" loading="lazy"></iframe>\n<p style="font-size:12px">${cfg.name} PAYE calculator by <a href="${SITE}${cfg.path}">Orion Soft</a></p>`
  const copy = (t, k) => navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(''), 2000) }).catch(() => {})
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'clamp(18px,3vw,28px)' }
  const h2 = { fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 800, color: C.heading, fontFamily: font, margin: '0 0 14px', letterSpacing: '-0.02em' }
  const btn = { background: C.surface, color: C.heading, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: '9px 14px', fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: 'pointer', textDecoration: 'none' }

  const calculator = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 18, alignItems: 'start' }}>
      <div style={{ ...card, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6, background: C.surface, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }} role="radiogroup" aria-label="Salary period">
          {[['monthly', 'Monthly salary'], ['annual', 'Annual salary']].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={period === k}
              onClick={() => { if (k !== period) { const f = k === 'annual' ? 12 : 1 / 12; setSalary(s => s * f); setBasic(b => b * f); setPeriod(k) } }}
              style={{ flex: 1, background: period === k ? C.gold : 'transparent', color: period === k ? '#060810' : C.text, border: 'none', borderRadius: 9, padding: '9px 10px', fontWeight: 700, fontSize: 13.5, fontFamily: font, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <Field id={`${code}-salary`} label={`Gross ${period} pay (before deductions)`} value={salary} onChange={setSalary} symbol={cfg.symbol} />
        {code === 'gh' && <>
          <Field id="gh-basic" label={`Basic ${period} salary (optional)`} value={basic} onChange={setBasic} symbol={cfg.symbol} hint="SSNIT is charged on basic salary. Leave empty if your whole pay is basic." />
          <div>
            <label htmlFor="gh-prov" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: font }}>Provident fund (% of basic, optional)</label>
            <input id="gh-prov" type="number" min="0" max="16.5" step="0.5" value={provident || ''} onChange={e => setProvident(Math.min(16.5, Math.max(0, Number(e.target.value) || 0)))} placeholder="0"
              style={{ width: '100%', boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: '13px 14px', color: C.heading, fontSize: 18, fontWeight: 700, fontFamily: font, outline: 'none' }} />
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5, fontFamily: font }}>Up to 16.5% is tax-free.</div>
          </div>
        </>}
        <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, fontFamily: font }}>{cfg.note}</div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...card, background: `linear-gradient(160deg, ${C.raised}, ${C.card})`, borderColor: `${C.gold}44` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: '0.1em', fontFamily: font }}>YOUR TAKE-HOME PAY (2026)</div>
          <div style={{ fontSize: 'clamp(32px,6vw,46px)', fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: '-0.03em', margin: '6px 0 2px' }} aria-live="polite">{money(r.net)}<span style={{ fontSize: 16, color: C.textMuted, fontWeight: 700 }}> / month</span></div>
          <div style={{ fontSize: 14, color: C.text, fontFamily: font }}>{money(r.net * 12)} a year · PAYE {money(r.paye)}/month · effective tax rate {r.effectiveTaxRate}%</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 8 }}>Monthly breakdown</div>
          {[['Gross pay', r.gross, C.heading], ...r.deductions.map(d => [d.label, -d.amount, C.text]), ['Take-home pay', r.net, C.mint]].map(([l, v, col], i, a) => (
            <div key={l + i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderTop: i === a.length - 1 ? `1px solid ${C.borderStrong}` : i ? `1px solid ${C.border}` : 'none', fontFamily: font, fontSize: 14, fontWeight: i === 0 || i === a.length - 1 ? 800 : 500, color: col }}>
              <span>{l}</span><span>{v < 0 ? `− ${money(-v)}` : money(v)}</span>
            </div>
          ))}
        </div>
        {embed && <a href={`${SITE}${cfg.path}`} target="_blank" rel="noopener" style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, textAlign: 'center', textDecoration: 'none' }}>Free {cfg.name} PAYE calculator by <strong style={{ color: C.gold }}>Orion Soft</strong></a>}
      </div>
    </div>
  )

  if (embed) return <div style={{ background: C.bg, padding: 14, minHeight: '100vh' }}>{calculator}</div>

  return (
    <div style={{ background: C.bg, fontFamily: font }}>
      <section style={{ padding: '140px clamp(16px,5vw,60px) 30px', textAlign: 'center', background: `radial-gradient(ellipse 60% 45% at 50% 0%, ${C.gold}14, transparent)` }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.gold, letterSpacing: '0.14em' }}>FREE TOOL · {cfg.law.toUpperCase()}</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: 800, color: C.heading, letterSpacing: '-0.03em', margin: '14px auto', lineHeight: 1.1, maxWidth: 900 }}>{cfg.h1}</h1>
        <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: C.text, lineHeight: 1.7, margin: '0 auto', maxWidth: 700 }}>{cfg.intro}</p>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '10px clamp(16px,4vw,32px) 40px' }}>
        {calculator}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 18, marginTop: 18 }}>
          <div style={card}>
            <h2 style={h2}>Share it</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHARE_TARGETS.filter(t => ['whatsapp', 'x', 'linkedin', 'facebook', 'telegram'].includes(t.id)).map(t => (
                <a key={t.id} href={t.build(shareLink, shareText)} target="_blank" rel="noopener noreferrer"
                  onClick={e => { e.preventDefault(); openShare(t, shareLink, shareText).then(m => { setNote(m); if (m) setTimeout(() => setNote(n => n === m ? '' : n), 15000) }) }}
                  style={{ ...btn, ...(t.id === 'whatsapp' ? { background: '#25D366', color: '#062E16', borderColor: '#25D366' } : {}) }}>{t.label}</a>
              ))}
              <button type="button" onClick={() => copy(`${shareText} ${shareLink}`, 'link')} style={btn}>{copied === 'link' ? 'Copied ✓' : 'Copy link'}</button>
            </div>
            {note && <p role="status" style={{ fontSize: 13, color: C.textMuted, margin: '10px 0 0' }}>{note}</p>}
          </div>
          <div style={card}>
            <h2 style={h2}>For employers</h2>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>This employee costs you <strong style={{ color: C.heading }}>{money(r.employerTotalCost)}</strong> a month, including {r.employerCosts.map(c => c.label.toLowerCase()).join(', ')}.</p>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>Orion Soft builds HR and payroll systems for African organisations. Talk to us about running payroll for your team.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setCurrentPage('international')} style={{ ...btn, background: C.gold, color: '#060810', border: 'none' }}>Work with us</button>
              <button type="button" onClick={() => setCurrentPage('consultation')} style={btn}>Book a free call</button>
            </div>
          </div>
        </div>

        {r.bands.length > 0 && (
          <div style={{ ...card, marginTop: 18 }}>
            <h2 style={h2}>How your tax is worked out</h2>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>Taxable pay: <strong style={{ color: C.heading }}>{money(r.taxable)}</strong> a month{code === 'ke' ? ` (gross minus NSSF, SHIF and Housing Levy). Tax ${money(r.taxBeforeRelief)} minus personal relief ${money(r.relief)} = PAYE ${money(r.paye)}.` : ' (gross minus SSNIT and provident fund).'}</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 420 }}>
                <thead><tr>{['Band', 'Rate', 'Your pay in band', 'Tax'].map(h => <th key={h} style={{ textAlign: 'left', color: C.textMuted, fontWeight: 700, padding: '8px 6px', borderBottom: `1px solid ${C.borderStrong}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {r.bands.map((b, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 6px', color: C.text, borderBottom: `1px solid ${C.border}` }}>{b.width === Infinity ? 'Above that' : `${i === 0 ? 'First' : 'Next'} ${money(b.width)}`}</td>
                      <td style={{ padding: '8px 6px', color: C.heading, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{Math.round(b.rate * 1000) / 10}%</td>
                      <td style={{ padding: '8px 6px', color: C.text, borderBottom: `1px solid ${C.border}` }}>{money(b.slice)}</td>
                      <td style={{ padding: '8px 6px', color: C.heading, borderBottom: `1px solid ${C.border}` }}>{money(b.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ ...card, marginTop: 18 }}>
          <h2 style={h2}>Questions people ask</h2>
          {cfg.faqs.map(([qq, a]) => (
            <details key={qq} style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0' }}>
              <summary style={{ cursor: 'pointer', color: C.heading, fontWeight: 700, fontSize: 15 }}>{qq}</summary>
              <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7, margin: '8px 0 0' }}>{a}</p>
            </details>
          ))}
        </div>

        <div style={{ ...card, marginTop: 18 }}>
          <h2 style={h2}>Add this calculator to your website</h2>
          <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>Free for blogs, HR sites and news sites. Developers can use our <a href="/developers" onClick={e => { e.preventDefault(); setCurrentPage('developers') }} style={{ color: C.gold, fontWeight: 700 }}>free PAYE API</a> too.</p>
          <pre style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, color: C.text, fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '0 0 10px' }}>{embedCode}</pre>
          <button type="button" onClick={() => copy(embedCode, 'embed')} style={btn}>{copied === 'embed' ? 'Copied ✓' : 'Copy code'}</button>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 18, color: C.textMuted, fontSize: 13.5 }}>
          <span>Other free calculators:</span>
          {[['Nigeria', 'paye-calculator'], ['Kenya', 'kenya-paye-calculator'], ['Ghana', 'ghana-paye-calculator']].filter(([, p]) => `/${p}` !== cfg.path).map(([l, p]) => (
            <a key={p} href={`/${p}`} onClick={e => { e.preventDefault(); setCurrentPage(p) }} style={{ ...btn, padding: '7px 12px' }}>{l}</a>
          ))}
        </div>

        <p style={{ color: C.textMuted, fontSize: 12.5, lineHeight: 1.6, margin: '18px 4px 0' }}>Estimates for salaried employees based on {cfg.law}. Not tax advice; your payslip may differ with benefits, other reliefs or other income.</p>
      </section>
    </div>
  )
}

export const KenyaPayePage = props => <CountryPayePage code="ke" {...props} />
export const GhanaPayePage = props => <CountryPayePage code="gh" {...props} />
