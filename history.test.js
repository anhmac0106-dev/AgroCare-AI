import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('public/index.html', 'utf8');
const script = fs.readFileSync('public/app.js', 'utf8');
const session = { access_token: 'test-access-token', user: { id: 'user-a' } };
async function boot({ loggedIn = true, pendingHistory, historyRecords } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost:3000', runScripts: 'outside-only' });
  const { window } = dom; const calls = []; let callback;
  window.URL.createObjectURL = () => 'blob:test'; window.URL.revokeObjectURL = () => {};
  window.confirm = () => true;
  window.supabase = { createClient: () => ({ auth: {
    getSession: async () => ({ data: { session: loggedIn ? session : null }, error: null }),
    onAuthStateChange: fn => { callback = fn; return {}; },
    signOut: async () => ({ error: null })
  } }) };
  window.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/config') return Response.json({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-key' });
    if (url === '/api/me') return Response.json({ success: true, user: { id: 'user-a', email: 'a@example.com', isAdmin: false }, quota: { used: 0, remaining: 10, limit: 10 } });
    if (url === '/api/history') {
      if (pendingHistory) await pendingHistory;
      return Response.json({ success: true, data: historyRecords || [{ id: 'history-a', user_id: 'user-a', disease: '<img src=x onerror=alert(1)>', solution: '<script>bad()</script>', level: 'Nhẹ', created_at: new Date().toISOString() }] });
    }
    if (url === '/api/reviews') return Response.json({ success: true, data: [{ id: 'review-a', user_id: 'user-a', name: '<svg onload=alert(1)>', content: '<img src=x>', star: 5 }] });
    if (url === '/api/detect') return Response.json({ success: true, result: JSON.stringify({ disease: 'Test', solution: 'Care', level: 'Nhẹ' }) });
    throw new Error(`Unexpected fetch ${url}`);
  };
  window.eval(script);
  return { dom, window, calls, event: (event, value) => callback(event, value) };
}

test('private API requests require auth and untrusted values render as text', async t => {
  const { dom, window, calls } = await boot(); t.after(() => dom.window.close());
  await window.agroReady;
  const history = window.document.getElementById('historyList');
  assert.ok(history.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(history.querySelectorAll('script, img[src=x]').length, 0);
  assert.equal(window.document.querySelectorAll('#reviewList svg, #reviewList img').length, 0);
  for (const call of calls.filter(c => c.url !== '/api/config')) assert.equal(call.options.headers.Authorization, 'Bearer test-access-token');
  assert.equal(window.document.getElementById('adminControls').hidden, true);
});

test('signed-out app does not fetch private data and disables recognition', async t => {
  const { dom, window, calls } = await boot({ loggedIn: false }); t.after(() => dom.window.close());
  await window.agroReady;
  assert.deepEqual(calls.map(c => c.url), ['/api/config']);
  assert.equal(window.document.getElementById('detectButton').disabled, true);
});

test('late private response cannot repopulate the page after logout', async t => {
  let release; const pendingHistory = new Promise(resolve => release = resolve);
  const { dom, window } = await boot({ pendingHistory }); t.after(() => dom.window.close());
  await new Promise(resolve => setTimeout(resolve, 20));
  window.document.getElementById('signOut').click();
  release(); await window.agroReady;
  assert.equal(window.document.getElementById('historyList').textContent.includes('onerror'), false);
  assert.equal(window.document.getElementById('accountEmail').textContent, '');
  assert.equal(window.document.getElementById('detectButton').disabled, true);
});

test('recognition never sends a client-authored history insert', async t => {
  const { dom, window, calls } = await boot(); t.after(() => dom.window.close());
  await window.agroReady;
  const file = new window.File(['image'], 'leaf.png', { type: 'image/png' });
  Object.defineProperty(window.document.getElementById('imageInput'), 'files', { configurable: true, value: [file] });
  window.document.getElementById('detectButton').click();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls.filter(c => c.url === '/api/detect' && c.options.method === 'POST').length, 1);
  assert.equal(calls.some(c => c.url === '/api/history' && c.options.method === 'POST'), false);
});

test('password recovery mode is cleared on manual logout and SIGNED_OUT', async t => {
  for (const action of ['manual', 'event']) {
    await t.test(action, async t => {
      const { dom, window, event } = await boot(); t.after(() => dom.window.close());
      await window.agroReady;
      event('PASSWORD_RECOVERY', session);
      await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(window.document.getElementById('updatePassword').hidden, false);
      if (action === 'manual') window.document.getElementById('signOut').click();
      else event('SIGNED_OUT', null);
      await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(window.document.getElementById('updatePassword').hidden, true);
      assert.equal(window.document.getElementById('signIn').hidden, false);
      assert.equal(window.document.getElementById('authForm').hidden, false);
    });
  }
});

test('100-row page offers next page with correct offset', async t => {
  const records = Array.from({ length: 100 }, (_, id) => ({ id, user_id: 'user-a', disease: 'Test' }));
  const { dom, window } = await boot({ historyRecords: records }); t.after(() => dom.window.close());
  await window.agroReady;
  let url;
  window.fetch = async value => { url = value; return Response.json({ success: true, data: [{ id: 'last', disease: 'Last record' }] }); };
  const button = [...window.document.querySelectorAll('#historyList button')].find(el => el.textContent === 'Tải thêm 100 bản ghi');
  assert.ok(button); button.click();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(url, '/api/history?offset=100');
  assert.equal(window.document.getElementById('totalDetect').textContent, '101');
});

test('JSON export rejects more than 10000 records without a partial download', async t => {
  const { dom, window } = await boot(); t.after(() => dom.window.close());
  await window.agroReady;
  let downloads = 0; let pages = 0;
  window.URL.createObjectURL = () => { downloads++; return 'blob:test'; };
  window.fetch = async () => { pages++; return Response.json({ success: true, data: Array.from({ length: 100 }, (_, id) => ({ id })) }); };
  window.document.getElementById('exportHistory').click();
  for (let i = 0; i < 100 && window.document.getElementById('exportHistory').disabled; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(pages, 101);
  assert.equal(downloads, 0);
  assert.match(window.document.getElementById('appMessage').textContent, /vượt 10.000/);
});
