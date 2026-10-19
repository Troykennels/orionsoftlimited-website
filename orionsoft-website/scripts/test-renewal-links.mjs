import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normaliseRenewalLink} from '../api/_lib/renewalLinks.js';
test('customer renewals accept only secure opaque OLM payment links',()=>{
 const valid='https://olm-console-production.up.railway.app/pay/fixture-token-with-at-least-24-characters';
 assert.equal(normaliseRenewalLink(valid),valid);
 for(const value of ['javascript:alert(1)','https://evil.invalid/pay/token','http://olm-console-production.up.railway.app/pay/token',valid+'?license_key=secret',valid+'#secret','https://user:pass@olm-console-production.up.railway.app/pay/fixture-token-with-at-least-24-characters','https://olm-console-production.up.railway.app/invoices/new'])assert.equal(normaliseRenewalLink(value),'');
 assert.equal(normaliseRenewalLink(''),'');
});
