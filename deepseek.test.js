import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlantDisease } from './deepseek.js';
import { PROMPT } from './prompt.js';

test('DeepSeek image request and error handling', async t => {
  const previous = process.env.DEEPSEEK_API_KEY;
  const previousModel = process.env.DEEPSEEK_MODEL;
  t.after(() => {
    if (previous === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previous;
    if (previousModel === undefined) delete process.env.DEEPSEEK_MODEL; else process.env.DEEPSEEK_MODEL = previousModel;
    t.mock.restoreAll();
  });
  delete process.env.DEEPSEEK_MODEL;
  process.env.DEEPSEEK_API_KEY = '';
  await assert.rejects(detectPlantDisease('missing.png'), /DEEPSEEK_API_KEY/);
  process.env.DEEPSEEK_API_KEY = 'test-key';
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'deepseek-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'leaf.png');
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
  await fs.writeFile(file, bytes);
  const request = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'deepseek-flash');
    assert.equal(payload.messages[0].content[0].text, PROMPT);
    assert.deepEqual(payload.response_format, { type: 'json_object' });
    assert.equal(payload.messages[0].content[1].image_url.url, 'data:image/png;base64,' + bytes.toString('base64'));
    return Response.json({ choices: [{ message: { content: '{"disease":"test"}' }, finish_reason: 'stop' }] });
  });
  assert.equal(await detectPlantDisease(file), '{"disease":"test"}');
  request.mock.mockImplementation(async () => new Response('secret upstream details', { status: 401 }));
  await assert.rejects(detectPlantDisease(file), /DeepSeek.*401/);
  request.mock.mockImplementation(async () => Response.json({ choices: [] }));
  await assert.rejects(detectPlantDisease(file), /DeepSeek/);
});
