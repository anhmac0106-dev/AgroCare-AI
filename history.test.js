import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('history saves fields from the JSON text returned by detection', async () => {
  const source = fs.readFileSync('public/app.js', 'utf8');
  const save = source.slice(source.indexOf('async function saveHistory('), source.indexOf('async function loadHistory('));
  const parse = source.slice(source.indexOf('function parseAIResult('), source.indexOf('function displayResult(response)'));
  let sent;
  const context = vm.createContext({ console, api: async (url, options) => { sent = JSON.parse(options.body); return { success: true }; } });
  vm.runInContext(parse + '\n' + save, context);
  const fields = { disease: 'Test disease', solution: 'Test solution', level: 'Nhẹ' };
  await context.saveHistory({ image: 'leaf.png', result: JSON.stringify(fields) });
  assert.deepEqual(sent, { image: 'leaf.png', ...fields });
});
