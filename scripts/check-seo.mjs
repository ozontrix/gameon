/** Validation helper; logs are kept in the OS temp directory, not the repository.
 * node scripts/check-seo.mjs lint
 * node scripts/check-seo.mjs start-build (background, useful for bounded command runners)
 * node scripts/check-seo.mjs build-status
 */
import { spawn, spawnSync } from 'node:child_process';
import { openSync, closeSync, readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(filename), '..');
const log = resolve(tmpdir(), 'gameon-seo-build.log');
const result = resolve(tmpdir(), 'gameon-seo-build-result.json');
const mode = process.argv[2];
if (mode === 'lint') {
  const paths = new Set();
  for (const args of [['diff', '--name-only', '--diff-filter=ACMR'], ['ls-files', '--others', '--exclude-standard']]) {
    const git = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    if (git.status !== 0) throw new Error(git.stderr);
    for (const path of git.stdout.trim().split(/\r?\n/)) if (/\.(ts|tsx|mjs)$/.test(path)) paths.add(path);
  }
  const lint = spawnSync(process.execPath, [resolve(root, 'node_modules/eslint/bin/eslint.js'), ...paths], { cwd: root, stdio: 'inherit' });
  process.exitCode = lint.status ?? 1;
} else if (mode === 'start-build') {
  if (existsSync(result)) unlinkSync(result);
  const descriptor = openSync(log, 'w');
  const worker = spawn(process.execPath, [filename, 'build-worker'], { cwd: root, detached: true, stdio: ['ignore', descriptor, descriptor] });
  worker.unref(); closeSync(descriptor);
  console.log(`Build started (PID ${worker.pid}). Log: ${log}`);
} else if (mode === 'build-worker') {
  const build = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: root, stdio: 'inherit' });
  build.on('exit', (code, signal) => writeFileSync(result, JSON.stringify({ code, signal })));
  build.on('error', error => writeFileSync(result, JSON.stringify({ code: 1, error: error.message })));
} else if (mode === 'build-status') {
  console.log(existsSync(log) ? readFileSync(log, 'utf8').slice(-16000) : 'No build log.');
  console.log(existsSync(result) ? readFileSync(result, 'utf8') : 'Build still running or no result recorded.');
} else {
  throw new Error('Choose lint, start-build or build-status.');
}