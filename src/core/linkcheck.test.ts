import test from 'node:test'; import assert from 'node:assert/strict';
import { isBlockedHost, isBlockedIp, extractPageText, relatedness } from './linkcheck.ts';
test('blocks private and internal targets', () => {
  for (const h of ['localhost', 'foo.local', '127.0.0.1', '10.1.2.3', '192.168.0.9', '172.20.1.1', '169.254.169.254', '100.64.0.1', '[::1]', 'intranet', '::ffff:10.0.0.1', 'fd00::1', 'fe80::1']) assert.equal(isBlockedHost(h), true, h);
});
test('allows public hosts', () => { for (const h of ['example.com', 'github.com', '8.8.8.8', '172.32.0.1']) assert.equal(isBlockedHost(h), false, h); assert.equal(isBlockedIp('1.1.1.1'), false); });
test('extractPageText', () => {
  const html = '<html><head><title>Pricing &amp; Plans</title><meta name="description" content="Our pricing page"><meta property="og:title" content="Acme Pricing"></head><body><h1>Choose <b>a plan</b></h1></body></html>';
  const t = extractPageText(html); assert.match(t, /Pricing & Plans/); assert.match(t, /Our pricing page/); assert.match(t, /Choose a plan/);
});
test('relatedness', () => {
  assert.equal(relatedness('Write pricing page copy', 'Acme pricing page: copy for our plans'), 1);
  assert.ok(relatedness('Write pricing page copy', 'Cute cat pictures and funny videos online')! < 0.4);
  assert.equal(relatedness('Write pricing page copy', 'Untitled'), undefined); // too thin to judge
});
