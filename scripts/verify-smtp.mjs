/** Check local SMTP connection/authentication without sending any email. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local'), quiet: true, override: true });
const require = createRequire(import.meta.url);
const compiled = { exports: {} };
const { outputText } = ts.transpileModule(readFileSync(resolve(root, 'src/lib/email/smtp.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});
new Function('require', 'module', 'exports', outputText)(require, compiled, compiled.exports);
const config = compiled.exports.getSmtpConfig();
if (!config) {
  console.error('SMTP verification failed: local SMTP configuration is missing or invalid.');
  process.exitCode = 1;
} else {
  const transport = compiled.exports.createSmtpTransport(config);
  try {
    await transport.verify();
    console.log(`SMTP connection and authentication verified: ${config.host}:${config.port}. No email sent. Sender verification and inbox delivery still require a real delivery test.`);
    console.log(`Configured sender: ${config.from.address}. Staff notifications: ${process.env.NOTIFY_RECIPIENTS?.trim() ? 'configured' : 'NOT configured'}.`);
  } catch (error) {
    // Only expose safe protocol status fields, never credentials or the SMTP response.
    const code = typeof error?.code === 'string' && /^[A-Z_]+$/.test(error.code) ? error.code : 'UNKNOWN';
    const status = Number.isInteger(error?.responseCode) ? ` (SMTP ${error.responseCode})` : '';
    console.error(`SMTP verification failed: ${code}${status}. Check Brevo credentials, account status and network access.`);
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}