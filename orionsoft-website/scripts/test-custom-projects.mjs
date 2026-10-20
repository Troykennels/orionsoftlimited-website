import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'isolated-custom-project-test-only';
for (const key of Object.keys(process.env)) if (/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|RESEND|BREVO|SMTP|PAYSTACK|VAPID|TERMII/.test(key)) delete process.env[key];
process.env.RESEND_API_KEY = 'synthetic-test-key';
process.env.RESEND_FROM_EMAIL = 'Orion Test <sender@example.invalid>';
process.env.ADMIN_EMAIL = 'owner@example.invalid';
const { storeBackend, list } = await import('../api/store.js');
assert.equal(storeBackend(), 'mem');
const { putRecord, listRecords } = await import('../api/_lib/records.js');
const { default: handler } = await import('../api/contact.js');
await putRecord('employees', 'custom-owner', { id: 'custom-owner', fullName: 'Local Owner', staffRole: 'owner', status: 'active' });
let failMail = false;
const emails = [];
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails', 'No other external requests are permitted');
  const body = JSON.parse(options.body); emails.push(body);
  assert(options.signal, 'Mail request must have a deadline');
  return { ok: !failMail, status: failMail ? 503 : 200, text: async () => 'Synthetic provider response' };
};
let serial = 0;
async function submit(changes = {}) {
  const number = ++serial;
  const req = { method: 'POST', headers: { 'x-forwarded-for': `127.0.0.${number}` }, body: { type: 'quote', requestCategory: 'software_customisation', name: 'Local Client', email: `client${number}@example.invalid`, phone: '08000000000', company: 'Fixture Organisation', projectKind: 'customise-product', product: 'CareCore AI', projectTitle: 'Ward workflow', message: 'Please customise our ward admission reports and approval workflow.', timing: 10000, ...changes } };
  const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() {} };
  await handler(req, res); return { req, res };
}
test('customisation saves a structured brief, emails the client and owner, and enters the sales pipeline', async () => {
  const before = emails.length, { req, res } = await submit();
  assert.equal(res.statusCode, 200); assert.equal(res.body.confirmationEmailSent, true); assert.match(res.body.ref, /^ORN-/);
  const lead = (await list('orionsoft:leads', 100)).find(item => item.email === req.body.email);
  assert.equal(lead.projectTitle, 'Ward workflow'); assert.equal(lead.requestCategory, 'software_customisation'); assert.equal(lead.product, 'CareCore AI');
  const confirmation = emails.slice(before).find(item => item.to.includes(req.body.email));
  assert.match(confirmation.subject, /Custom Software Request Registered/); assert(confirmation.html.includes(res.body.ref));
  assert.match(confirmation.html, /Our team will contact you to discuss/); assert.match(confirmation.html, /Ward workflow/);
  assert(emails.slice(before).some(item => item.to.includes('owner@example.invalid')));
  assert((await listRecords('deals')).some(deal => deal.contactEmail === req.body.email));
});
test('provider failure retains the saved brief and reports that confirmation was not sent', async () => {
  failMail = true;
  try { const { req, res } = await submit(); assert.equal(res.statusCode, 200); assert.equal(res.body.confirmationEmailSent, false); assert((await list('orionsoft:leads', 100)).some(item => item.email === req.body.email)); }
  finally { failMail = false; }
});
test('incomplete customisation requests cannot create leads or emails', async () => {
  const before = emails.length, count = (await list('orionsoft:leads', 100)).length;
  for (const changes of [{ message: 'short' }, { company: '' }, { projectKind: 'unknown' }, { projectTitle: '' }, { product: '' }]) assert.equal((await submit(changes)).res.statusCode, 400);
  assert.equal(emails.length, before); assert.equal((await list('orionsoft:leads', 100)).length, count);
});
test('project text is escaped in both customer and owner emails', async () => {
  const before = emails.length; await submit({ projectTitle: '<script>bad()</script>', message: '<img src=x onerror=bad()> Please change our reports.' });
  for (const email of emails.slice(before)) { assert(!email.html.includes('<script>')); assert(!email.html.includes('<img src=x')); assert(email.html.includes('&lt;')); }
});

test('public customisation fields cannot override internal lead ownership or status',async()=>{
 const {req,res}=await submit({id:'spoofed',status:'won',contactName:'spoofed',source:'chatbot',ownerId:'spoofed'});
 assert.equal(res.statusCode,200);
 const lead=(await list('orionsoft:leads',100)).find(item=>item.email===req.body.email);
 assert.notEqual(lead.id,'spoofed');assert.equal(lead.status,'new');assert.equal(lead.contactName,'Local Client');assert.equal(lead.ownerId,undefined);
});

test('custom software is listed once in the public search sitemap',async()=>{
 const {sitemapUrls}=await import('../api/public/sitemap.js');
 const urls=await sitemapUrls();assert.equal(urls.filter(url=>url.loc==='/custom-software').length,1);
});
