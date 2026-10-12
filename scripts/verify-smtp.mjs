/** Check SMTP auth. Explicit --send-to-self additionally sends one diagnostic to the configured sender. */
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
    console.log(`SMTP connection and authentication verified: ${config.host}:${config.port}. Verification itself sends no email.`);
    console.log(`Configured sender: ${config.from.address}. Staff notifications: ${process.env.NOTIFY_RECIPIENTS?.trim() ? 'configured' : 'NOT configured'}.`);
    if (process.argv.includes('--send-to-self')) {
      const result = await transport.sendMail({
        from: config.from,
        to: config.from.address,
        subject: 'GameOn SMTP delivery diagnostic (no registration)',
        text: 'This is a one-time GameOn SMTP diagnostic. No customer registration or newsletter subscription was created. Check Brevo transactional logs and your inbox to confirm delivery.',
      });
      if (!result.accepted?.length) throw Object.assign(new Error('No recipient accepted'), { code: 'EENVELOPE', command: 'RCPT TO' });
      console.log('Diagnostic email accepted by SMTP. Inbox delivery must be confirmed in Brevo transactional logs and the sender mailbox.');
    }
  } catch (error) {
    compiled.exports.logSmtpFailure('SMTP verification', error);
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}