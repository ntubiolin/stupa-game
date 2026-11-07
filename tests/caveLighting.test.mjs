import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '../scripts/cave-lighting-test.mjs');

test('Adventure mode cave enclosure, subterranean sky shader, camera ceiling clamp, and 0-PointLight interior lighting', () => {
  const out = execFileSync(process.execPath, [scriptPath], { encoding: 'utf8' });
  assert.match(out, /PASS: sky subterranean shader, camera cave ceiling clamp/);
});
