/** Read-only preflight. Never prints tokens, personal data, or raw Graph errors. */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
function value(key) { return (process.env[key] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2'); }
const required = ['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_APP_SECRET','WHATSAPP_VERIFY_TOKEN','CRON_SECRET'];
let missing = false;
for (const key of required) {
  const present = Boolean(value(key)); console.log(`${key}: ${present ? 'set' : 'MISSING'}`); if (!present) missing = true;
}
if (process.argv.includes('--meta')) {
  const token = value('WHATSAPP_ACCESS_TOKEN'), phone = value('WHATSAPP_PHONE_NUMBER_ID'), waba = value('WHATSAPP_WABA_ID');
  const version = value('WHATSAPP_API_VERSION') || 'v25.0';
  if (!token || !/^\d+$/.test(phone) || !/^v\d+\.\d$/.test(version)) {
    console.error('Meta preflight skipped: invalid or missing credentials.'); process.exitCode = 1;
  } else {
    async function read(path, label) {
      try {
        const r = await fetch(`https://graph.facebook.com/${version}/${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
        const body = await r.json();
        if (!r.ok) { console.log(`${label}: FAILED HTTP ${r.status}; provider code ${body.error?.code ?? 'unknown'}`); process.exitCode = 1; return null; }
        console.log(`${label}: OK`); return body;
      } catch { console.log(`${label}: network/response failure`); process.exitCode = 1; return null; }
    }
    const sender = await read(`${phone}?fields=id,quality_rating,code_verification_status`, 'Sender access');
    if (sender) console.log(`Sender verification: ${sender.code_verification_status ?? 'unknown'}; quality: ${sender.quality_rating ?? 'unknown'}`);
    if (waba && /^\d+$/.test(waba)) {
      const name = value('WHATSAPP_TEMPLATE_NAME') || 'booking_with_qr_new';
      const templates = await read(`${waba}/message_templates?name=${encodeURIComponent(name)}&fields=name,status,language,components&limit=100`, 'Template access');
      const template = templates?.data?.find(t => t.name === name && t.language === (value('WHATSAPP_TEMPLATE_LANGUAGE') || 'en'));
      const valid = template?.status === 'APPROVED' && template.components?.some(c => c.type === 'HEADER' && c.format === 'IMAGE');
      console.log(`Approved template with image header: ${valid ? 'YES' : 'NOT VERIFIED'}`);
      if (!valid) process.exitCode = 1;
      const subscriptions = await read(`${waba}/subscribed_apps`, 'WABA app subscriptions');
      console.log(`Subscribed app count: ${subscriptions?.data?.length ?? 'unknown'}`);
      if (subscriptions && !subscriptions.data?.length) process.exitCode = 1;
    } else { console.log('WABA template/subscription checks skipped: WHATSAPP_WABA_ID missing.'); }
  }
}
if (missing) process.exitCode = 1;