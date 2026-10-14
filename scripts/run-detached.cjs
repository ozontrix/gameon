/**
 * Runs a long command fully detached with its output in a log file.
 * `node scripts/run-detached.cjs <logFile> <command...>`
 * Used for builds that outlive a single shell invocation.
 */
const { spawn } = require('node:child_process');
const { openSync } = require('node:fs');
const [logFile, ...command] = process.argv.slice(2);
if (!logFile || command.length === 0) {
  console.error('usage: node scripts/run-detached.cjs <logFile> <command...>');
  process.exit(1);
}
const fd = openSync(logFile, 'w');
const child = spawn(command[0], command.slice(1), {
  cwd: process.cwd(),
  detached: true,
  stdio: ['ignore', fd, fd],
  shell: false,
});
child.unref();
console.log(`started pid=${child.pid} log=${logFile}`);
