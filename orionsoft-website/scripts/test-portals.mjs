// Isolated permission regressions: never load .env or use a real database.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir } from 'node:fs/promises';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'orion-audit-isolated-session-secret-for-tests';
for (const key of ['REDIS_URL', 'REDIS_PRIVATE_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'DATA_DIR']) delete process.env[key];
const { storeBackend } = await import('../api/store.js');
assert.equal(storeBackend(), 'mem');
const { putRecord, setLookup } = await import('../api/_lib/records.js');
const { requireStaff, requireAdminAuth, signSession, getSessionFromRequest, ADMIN_COOKIE, APPLICANT_COOKIE } = await import('../api/_lib/auth.js');

function response() {
  return { statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; },
    status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; },
    send(v) { this.body = v; return this; }, end() { return this; },
  };
}
const request = (cookie = '', body = {}, method = 'GET') => ({ method, headers: { cookie }, query: {}, body, socket: { remoteAddress: '127.0.0.1' } });
const cookie = (name, payload) => `${name}=${encodeURIComponent(signSession(payload))}`;

test('admin and staff password sign-ins issue separate cookies', async () => {
  const { hashPassword } = await import('../api/_lib/auth.js');
  const { default: handler } = await import('../api/auth/login.js');
  const hash = await hashPassword('audit-test-password');
  for (const [portal, entity] of [['admin', 'admins'], ['staff', 'employees']]) {
    const email = `${portal}@example.invalid`, id = `login-${portal}`;
    await putRecord(entity, id, { id, email, username: 'Audit', fullName: 'Audit', passwordHash: hash, status: 'active', role: 'super_admin', staffRole: 'staff' });
    await setLookup(entity, 'email', email, id);
    const res = response(); await handler(request('', { portal, email, password: 'audit-test-password' }, 'POST'), res);
    assert.equal(res.statusCode, 200); assert.equal(res.body.ok, true);
    assert.match(res.headers['Set-Cookie'], new RegExp(`^${portal === 'admin' ? ADMIN_COOKIE : 'orionsoft_session'}=`));
    assert.match(res.headers['Set-Cookie'], /HttpOnly/);
    const rejected = response(); await handler(request('', { portal, email, password: 'wrong' }, 'POST'), rejected);
    assert.equal(rejected.statusCode, 401);
  }
});

test('all admin and staff record APIs reject anonymous access', async t => {
  for (const group of ['admin', 'staff']) for (const file of await readdir(new URL(`../api/${group}/`, import.meta.url))) {
    if (!file.endsWith('.js')) continue;
    await t.test(`${group}/${file}`, async () => {
      const { default: handler } = await import(`../api/${group}/${file}`);
      const res = response();
      await handler(request(), res);
      assert.ok([401, 403, 405].includes(res.statusCode), `unexpected status ${res.statusCode}`);
      if (res.statusCode === 405) {
        const post = response(); await handler(request('', {}, 'POST'), post);
        assert.ok([401, 403].includes(post.statusCode), `POST unexpectedly returned ${post.statusCode}`);
      }
    });
  }
});

test('owner uses Staff Office through a live linked admin account', async () => {
  await putRecord('admins', 'audit-owner', { id: 'audit-owner', status: 'active', role: 'super_admin', username: 'Owner' });
  await putRecord('employees', 'audit-owner-staff', { id: 'audit-owner-staff', status: 'active', fullName: 'Owner' });
  await setLookup('employees', 'admin', 'audit-owner', 'audit-owner-staff');
  const req = request(cookie(ADMIN_COOKIE, { sub: 'audit-owner', role: 'admin' }));
  const auth = await requireStaff(req, response());
  assert.equal(auth.employee.id, 'audit-owner-staff');
  assert.equal(auth.session.viaAdmin, true);
  await putRecord('admins', 'audit-owner', { id: 'audit-owner', status: 'disabled' });
  const res = response();
  assert.equal(await requireStaff(req, res), null); assert.equal(res.statusCode, 401);
});

test('downgraded admin cannot use an old super-admin token', async () => {
  await putRecord('admins', 'audit-editor', { id: 'audit-editor', status: 'active', role: 'editor' });
  const req = request(cookie(ADMIN_COOKIE, { sub: 'audit-editor', role: 'admin', adminRole: 'super_admin' }));
  req.url = '/api/admin/payroll';
  const res = response(); assert.equal(await requireAdminAuth(req, res), null); assert.equal(res.statusCode, 403);
});

test('malformed session cookies are treated as signed out', () => {
  assert.equal(getSessionFromRequest(request('orionsoft_session=%E0%A4%A')), null);
});

test('applicants see only their applications and public recruiter messages', async () => {
  const { default: handler } = await import('../api/applicant/portal.js');
  const email = 'candidate@example.invalid';
  for (const [id, e] of [['audit-app-1', email], ['audit-app-2', email], ['audit-other', 'other@example.invalid']]) {
    await putRecord('applicants', id, { id, email: e, createdAt: '2026-01-01', status: 'reviewing', internalNotes: 'private', messages: [{ id: 'secret', internal: true, text: 'private' }, { id: 'public', from: 'recruiter', text: 'Welcome' }] });
  }
  const signed = cookie(APPLICANT_COOKIE, { role: 'applicant', email, appIds: ['audit-app-1'] });
  const res = response(); await handler(request(signed), res);
  assert.equal(res.body.applications.length, 1); assert.equal(res.body.applications[0].id, 'audit-app-1');
  assert.equal(res.body.applications[0].internalNotes, undefined);
  assert.deepEqual(res.body.applications[0].messages.map(m => m.id), ['public']);
  const denied = response(); await handler(request(signed, { applicationId: 'audit-app-2', phone: 'test' }, 'PATCH'), denied);
  assert.equal(denied.statusCode, 404);
});

test('client invoices, tickets and PDFs are restricted to the signed-in client', async () => {
  const { default: handler } = await import('../api/client/portal.js');
  const { CLIENT_COOKIE } = await import('../api/client/auth.js');
  await putRecord('tickets', 'audit-ticket', { id: 'audit-ticket', clientEmail: 'other@example.invalid', comments: [] });
  await putRecord('invoices', 'audit-invoice', { id: 'audit-invoice', clientEmail: 'other@example.invalid', status: 'sent' });
  const signed = cookie(CLIENT_COOKIE, { role: 'client', email: 'client@example.invalid' });
  const res = response(); await handler(request(signed), res);
  assert.deepEqual(res.body.invoices, []); assert.deepEqual(res.body.tickets, []);
  const pdfReq = request(signed); pdfReq.query.pdf = 'invoice:audit-invoice';
  const pdf = response(); await handler(pdfReq, pdf); assert.equal(pdf.statusCode, 404);
  const reply = response(); await handler(request(signed, { action: 'reply', id: 'audit-ticket', message: 'test' }, 'POST'), reply);
  assert.equal(reply.statusCode, 404);
});
