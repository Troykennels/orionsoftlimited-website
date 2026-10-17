# Orion Soft website audit and publicity rollout

Audit date: 17 October 2026 (Africa/Lagos). Target: https://www.orionsoftlimited.com.

## Deployment status

Code changes in this working tree have been built and tested locally. They have
not been deployed. Existing edits to Dashboard.jsx, FieldAdmin.jsx,
QueriesAdmin.jsx and StaffOfficeAdmin.jsx were preserved. No production account,
application, invoice, staff attendance, payment or customer message was changed.

The live public sitemap's 65 URLs were submitted to IndexNow on 17 October 2026.
The endpoint returned HTTP 200. This is receipt of URLs, not confirmation of
indexing. The new services/resources sitemap entries become available after
deployment of the API.

## Confirmed defects and changes

| Finding | Evidence | Change |
| --- | --- | --- |
| Admin, client and applicant portals blank in production | Live browser audit: each returned HTTP 200 with zero rendered text. Their HTML referenced /src/main.jsx. | Generate portal shells from Vite's compiled output. Build now verifies that each referenced app script exists. |
| Owner's linked admin session crashes staff authorization | requireStaff called getRecord before a shadowing import initialized that name. | Use the module-level record helpers; test active and revoked owner access. |
| Malformed cookie can crash protected requests | Cookie percent-decoding could throw before token verification. | Treat malformed cookies as signed out; covered by regression test. |
| Canonical URL, description and social tags remain from previous route | App updated page titles but did not synchronize the rest of the head on navigation. | Generate a public metadata manifest and update route tags and page-specific structured data on navigation. |
| Missing-page UI inherits homepage indexing metadata | Unknown live URL returned HTTP 200 with homepage canonical. | Set noindex and its own canonical for missing or disabled pages. HTTP status remains a hosting limitation below. |
| Custom services and resources absent from generated public pages/sitemap | Pages existed in the router but were omitted from build metadata and sitemap. | Add both, respecting the resources feature flag; deduplicate sitemap entries. |
| Primary navigation uses buttons for page changes | Links lack href addresses for crawlers and opening new tabs. | Use real anchors for desktop page navigation while retaining normal in-app navigation. |
| Search notifications miss supported database configurations | IndexNow checked only two environment names, although the store supports other Redis/KV names. | Check the actual store backend and avoid marking a release submitted when zero URLs were sent. |

## Verification and practical limits

- Live desktop crawl: 70 URLs, including 65 sitemap pages, four portals and a
  deliberately missing URL. Nine additional mobile pages checked at 390px.
- Consultation and FinanceCore were rechecked after an initial slow load; both
  rendered their content without browser errors.
- Production build: 67 public HTML pages and four compiled private portal shells
  verified, including parseable JSON-LD and correct public canonical URLs.
- API regression suite: 74 passing checks, including all 67 admin/staff endpoints
  rejecting anonymous requests; separate admin/staff sign-ins; revoked owner and
  downgraded admin access; applicant scoping; client document and ticket ownership.
- Browser fixture suite: synthetic signed-in accounts on loopback, login shells
  and portal home views at desktop/mobile sizes, plus admin/staff section smoke
  checks. Evidence is written to artifacts/local-portals.json and screenshots.
- Live browser evidence: artifacts/live-desktop.json, live-mobile.json and
  live-followup.json. IndexNow receipt: artifacts/indexnow-submission.json.
- Commands: `npm run build`, `npm run test:portals` and
  `node scripts/test-browser-portals.mjs` (requires Playwright and Edge).
- The baseline full lint run reported 86 errors and three warnings. Three errors
  were a Node globals configuration issue, corrected here. Remaining lint debt
  includes unused legacy code and React compiler/style diagnostics. This is not
  a claim that the entire repository is lint-clean.
- Signed-in production accounts, real email delivery, payment settlement,
  camera/GPS hardware, push delivery and Google OAuth were not exercised.
  Synthetic empty-state screens do not validate every workflow with real data.
- Unknown routes still receive HTTP 200 from the SPA hosting catch-all. The new
  noindex rule mitigates indexing, but a real HTTP 404 requires routing changes
  coordinated with CMS product and public employee-profile routes.
- CMS metadata is a build snapshot. New blog posts have a live HTML endpoint;
  new custom products/public employee profiles need equivalent server-rendered
  metadata or a frontend rebuild for reliable non-JavaScript previews.

## Publicity rollout

Goal: attract organisations looking for products or custom development and turn
that interest into qualified enquiries, demos, proposals and paying customers.
Public product, services, careers and editorial pages are the discovery targets.
Private staff, admin, applicant and client account pages retain noindex.

### First: publish the repairs and verify search ownership

Deploy the frontend to Vercel and API to Railway, then rerun the live portal
audit. Open Google Search Console using the company Google account and select
the www domain property. Existing Google verification tags are already present
in index.html; the audit does not confirm which account owns those properties.
Submit `https://www.orionsoftlimited.com/sitemap.xml` in its Sitemaps screen,
inspect the homepage, products, services, international and priority product
URLs, and review exclusions. Repeat sitemap submission in Bing Webmaster Tools.

Use the actual Orion Soft Limited name, Lagos contact details and established
social accounts consistently. Existing public settings already contain LinkedIn,
Facebook, Instagram, X, YouTube, GitHub, TikTok and a Google review link. These
are configuration findings, not verified account ownership or activity.

### Four weeks of focused promotion

| Week | Material to prepare and publish through company accounts | Destination |
| --- | --- | --- |
| 1 | Company introduction, CareCore workflow demo, SchoolCore workflow demo | /about, /carecore, /schoolcore |
| 2 | StaffCore attendance/leave walkthrough, Orion CRM sales workflow, custom development service overview | /staffcore, /orion-crm, /services |
| 3 | Customer-approved case study, international development offer, ComplianceCore walkthrough | /case-studies, /international, /compliancecore |
| 4 | Directors' Portal demo, software licensing demo, practical comparison/FAQ article answering a real sales question | /directors-portal, /license-manager, relevant blog article |

Show real screenshots and demonstrations. Remove personal data and obtain client
permission before publishing a client name, quotation or results. Promote only
available products as available; TeleHealth currently describes itself as
coming soon. Don't invent deployments, statistics, reviews, accreditations or
offices in countries where the company has no presence.

Turn each approved demo into one full video, a short clip, a useful written
explanation and a product-page link. Give each piece one clear call to action:
book a demo or discuss a custom project. Use tagged campaign links, for example:

`https://www.orionsoftlimited.com/carecore?utm_source=linkedin&utm_medium=organic_social&utm_campaign=product_demos`

The current site records page views/referrers and form submissions. Persisting
campaign parameters through enquiry submission remains a separate measurement
improvement; do not describe UTM-to-revenue attribution as already implemented.

### Ready-to-review copy

These drafts have not been published or sent to anyone.

**Company introduction:** Orion Soft Limited builds software for hospitals,
schools and businesses, alongside custom websites, web apps and mobile apps.
Based in Lagos and serving organisations internationally. Explore our products
or tell us what your operation needs: https://www.orionsoftlimited.com/products

**CareCore:** Patient records, pharmacy, laboratory and hospital billing belong
in a connected workflow. Explore CareCore's hospital management modules and
watch the product tour: https://www.orionsoftlimited.com/carecore

**SchoolCore:** Bring student records, attendance, results, fees and parent
communication into one school management system. See SchoolCore and request a
demo: https://www.orionsoftlimited.com/schoolcore

**StaffCore:** Clock-ins, field visits, leave, tasks and staff communication in
one staff portal. See how StaffCore works on your team's phones:
https://www.orionsoftlimited.com/staffcore

**Orion CRM:** Follow enquiries through your sales pipeline, proposals,
invoicing and customer support. Explore Orion CRM:
https://www.orionsoftlimited.com/orion-crm

**Custom development:** Need software built around your own workflow? Orion Soft
builds websites, web apps, mobile apps and business systems for organisations in
Nigeria and abroad. Discuss your project:
https://www.orionsoftlimited.com/international

### Weekly review

Record actual search impressions, search clicks, indexed priority pages,
qualified enquiries, booked demos, proposals and closed customers. Establish a
baseline before setting growth targets. Use customer questions to choose the
next useful article or demo. Paid campaigns require an agreed market, offer,
budget and conversion measurement; no advertising spend was initiated.

Search visibility and worldwide rankings are controlled by search engines.
Google explicitly does not guarantee crawling, indexing or serving a page:
https://developers.google.com/search/docs/fundamentals/how-search-works

Implementation references:

- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://www.indexnow.org/documentation
