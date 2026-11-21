// Requires psql on PATH and PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD.
// Use ONLY a disposable Supabase test project and dedicated test Auth user.
// This test deletes that user's quota entries before and after testing.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const userId = process.argv[2];
assert.match(userId || '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Pass the UUID of a disposable test Auth user');
if (process.env.AGROCARE_DISPOSABLE_TEST !== 'yes') {
  throw new Error('Set AGROCARE_DISPOSABLE_TEST=yes only for a disposable database');
}
const sql = query => new Promise((resolve, reject) => {
  const child = spawn('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], { windowsHide: true });
  let output = '', error = '';
  child.stdout.on('data', chunk => output += chunk);
  child.stderr.on('data', chunk => error += chunk);
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
});
await sql(`delete from public.recognition_usage where user_id = '${userId}'::uuid`);
try {
  const settled = await Promise.allSettled(Array.from({ length: 20 }, () =>
    sql(`set role service_role; select public.reserve_recognition('${userId}'::uuid)::text`)));
  const failed = settled.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  // SET emits a command tag before the JSON line on some psql versions.
  const results = settled.map(result => JSON.parse(result.value.split('\n').find(line => line.trim().startsWith('{'))));
  assert.equal(results.filter(result => result.allowed).length, 10);
  assert.equal(results.filter(result => !result.allowed).length, 10);
  assert.equal(Number(await sql(`select count(*) from public.recognition_usage where user_id='${userId}'::uuid`)), 10);
  console.log('PASS: 20 concurrent transactions accepted exactly 10 reservations');
} finally {
  await sql(`delete from public.recognition_usage where user_id='${userId}'::uuid`);
}
