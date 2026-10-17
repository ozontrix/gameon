/** node --test scripts/test-whatsapp.mjs. Real PNGs, mocked Meta and DB. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const id = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
function setEnv(overrides = {}) {
  const env = { WHATSAPP_ACCESS_TOKEN:'test-token', WHATSAPP_PHONE_NUMBER_ID:'12345', WHATSAPP_API_VERSION:'v25.0', WHATSAPP_TEMPLATE_NAME:'booking_with_qr_new', WHATSAPP_WABA_ID:'54321', WHATSAPP_APP_SECRET:'test-secret', WHATSAPP_VERIFY_TOKEN:'verify-token', ...overrides };
  const saved = new Map(Object.keys(env).map(key => [key,process.env[key]]));
  for (const [key,value] of Object.entries(env)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  return () => { for (const [key,value] of saved) if (value === undefined) delete process.env[key]; else process.env[key] = value; };
}
function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = {exports:{}}; cache.set(filename,compiledModule);
    const compiled = ts.transpileModule(readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    new Function('require','module','exports',compiled)(name => {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = name.startsWith('@/') ? resolve(root,'src',name.slice(2)) : resolve(dirname(filename),name);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : target);
      }
      return require(name);
    },compiledModule,compiledModule.exports);
    return compiledModule.exports;
  }
  return load;
}
function message(category='booking', reference=id, patch={}) {
  return {id:randomUUID(),dedupe_key:`${category}-confirmed:${reference}`,category,reference_id:reference,status:'queued',consent_at:new Date().toISOString(),attempts:0,retryable:true,next_attempt_at:'2000-01-01',...patch};
}
function booking(patch={}) {
  return {id,status:'CONFIRMED',whatsapp_consent:true,contact_phone:'8572005698',contact_name:'Player',booking_date:'2026-10-19',start_time:'19:00:00',end_time:'20:00:00',facilities:{court_types:{sports:{name:'Pickleball'}}},...patch};
}
function harness({rows=[message()],bookings=[booking()],client={},tables={}}={}) {
  const state={whatsapp_messages:rows,bookings,whatsapp_opt_outs:[],...tables};
  const calls={sent:[],images:[],jobs:[],rpc:[]}; let dbFailure=false;
  const db={
    from(table) {
      const filters=[]; let update,upsert,max=Infinity;
      const q={select(){return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},in(k,vs){filters.push(row=>vs.includes(row[k]));return q;},
        not(k){filters.push(row=>row[k]!=null);return q;},lt(k,v){filters.push(row=>row[k]<v);return q;},lte(k,v){filters.push(row=>row[k]<=v);return q;},
        is(k,v){filters.push(row=>(row[k]??null)===v);return q;},order(){return q;},range(){return q;},limit(v){max=v;return q;},
        update(value){update=value;return q;},upsert(value){upsert=value;return q;},
        async maybeSingle(){const r=run();return {...r,data:r.data?.[0]??null};},then(ok,bad){return Promise.resolve(run()).then(ok,bad);}};
      function run(){
        if(dbFailure) return {data:null,error:new Error('DB offline')};
        state[table]??=[];
        if(upsert){const old=state[table].find(row=>row.phone===upsert.phone);if(old)Object.assign(old,upsert);else state[table].push(upsert);return {data:[upsert],error:null};}
        const found=state[table].filter(row=>filters.every(f=>f(row))).slice(0,max);
        if(update)found.forEach(row=>Object.assign(row,update));
        return {data:found.map(row=>({...row})),error:null,count:found.length};
      }
      return q;
    },
    async rpc(name,args){
      calls.rpc.push({name,args});if(dbFailure)return {data:null,error:new Error('DB offline')};
      if(name==='whatsapp_recover_stale'){
        rows.filter(r=>r.status==='sending'&&r.locked_until<new Date().toISOString()).forEach(r=>Object.assign(r,{status:'unknown',retryable:false}));
        return {data:null,error:null};
      }
      if(name==='claim_whatsapp_delivery'){
        const row=rows.find(r=>r.id===args.p_id);
        if(!row||!row.consent_at||!['queued','processing','failed','skipped'].includes(row.status)||(row.status==='processing'&&row.locked_until>new Date().toISOString())||(!args.p_force&&(!row.retryable||row.attempts>=3||row.next_attempt_at>new Date().toISOString())))return {data:null,error:null};
        Object.assign(row,{status:'processing',attempts:row.attempts+1,lock_token:randomUUID(),locked_until:new Date(Date.now()+120000).toISOString(),wa_message_id:null});return {data:{...row},error:null};
      }
      if(name==='whatsapp_apply_receipt'){
        const row=rows.find(r=>r.wa_message_id===args.p_message_id||`${r.id}:${r.lock_token}`===args.p_correlation);
        if(!row||(row.wa_message_id&&row.wa_message_id!==args.p_message_id))return {data:false,error:null};
        const rank={sent:1,delivered:2,read:3};
        if((args.p_status==='failed'&&['delivered','read'].includes(row.status))||(row.status==='failed'&&args.p_status==='sent')||(args.p_status!=='failed'&&(rank[row.status]??0)>(rank[args.p_status]??0)))return {data:false,error:null};
        Object.assign(row,{status:args.p_status,wa_message_id:args.p_message_id,retryable:false,locked_until:null});return {data:true,error:null};
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  const load=loader({'../db/supabase':{supabaseAdmin:db},'@/lib/db/supabase':{supabaseAdmin:db},
    'next/server':{...require('next/server'),after:fn=>calls.jobs.push(fn)},
    '../whatsapp/client':{
      uploadMedia:async(config,image)=>{calls.images.push(image);return client.upload?client.upload(config,image):{ok:true,data:{mediaId:`media-${calls.images.length}`}};},
      sendTemplateMessage:async(config,payload)=>{calls.sent.push(payload);return client.send?client.send(config,payload):{ok:true,data:{messageId:`wamid-${calls.sent.length}`}};},
    }});
  return {state,calls,db,load,failDb:()=>{dbFailure=true;},service:load('src/lib/services/whatsapp.service.ts').WhatsAppService};
}
function configured(name,fn){test(name,async()=>{const restore=setEnv();try{await fn();}finally{restore();}});}

test('numbers normalize, malformed and foreign numbers are rejected',()=>{
  const {toWhatsAppNumber}=loader()('src/lib/whatsapp/phone.ts');
  for(const n of ['8572005698','+8572005698','918572005698','+91 85720 05698','00918572005698','08572005698','9123456789'])assert.equal(toWhatsAppNumber(n),n==='9123456789'?'919123456789':'918572005698');
  for(const n of ['',null,'123','+12025550123','91857200569','91918572005698'])assert.equal(toWhatsAppNumber(n),null);
});
test('delivery log display includes +91 exactly once for local and international numbers',()=>{
  const {prettyWhatsAppNumber}=loader()('src/lib/whatsapp/phone.ts');
  for(const phone of ['8572005698','+8572005698','918572005698','+918572005698'])assert.equal(prettyWhatsAppNumber(phone),'+91 85720 05698');
});
configured('India recipients cannot be redirected by a country-code environment override',()=>{
  const restore=setEnv({WHATSAPP_DEFAULT_COUNTRY_CODE:'1'});
  try{assert.equal(loader()('src/lib/whatsapp/config.ts').getWhatsAppConfig().countryCode,'91');}finally{restore();}
});
configured('configuration defaults to v25.0 without shared header settings',()=>{
  delete process.env.WHATSAPP_API_VERSION;
  const {getWhatsAppConfig}=loader()('src/lib/whatsapp/config.ts');
  assert.equal(getWhatsAppConfig().version,'v25.0');assert.equal('mediaId' in getWhatsAppConfig(),false);
  process.env.WHATSAPP_PHONE_NUMBER_ID='bad';assert.equal(getWhatsAppConfig(),null);
});
test('each category generates a distinct PNG with authoritative QR payload',async()=>{
  const {checkInPayload,generateBookingQr}=loader()('src/lib/whatsapp/qr.ts');const images=[];
  for(const kind of ['booking','event','tournament']){
    assert.equal(checkInPayload(kind,id),kind==='booking'?id:`gameon:${kind}:${id}`);
    const image=await generateBookingQr(kind,id);images.push(Buffer.from(image.bytes).toString('base64'));
    assert.deepEqual([...image.bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(image.type,'image/png');
  }
  assert.equal(new Set(images).size,3);assert.throws(()=>checkInPayload('booking','bad'));
});
configured('confirmation uploads reservation QR, exact template body, and cannot resend',async()=>{
  const h=harness();const row=h.state.whatsapp_messages[0];assert.equal((await h.service.process(row.id)).ok,true);
  await h.service.process(row.id);await h.service.retryMessage(row.id);assert.equal(h.calls.sent.length,1);assert.equal(h.calls.images.length,1);
  const p=h.calls.sent[0];assert.equal(p.to,'918572005698');assert.equal(row.to_phone,`+${p.to}`);assert.equal(row.payload.to,p.to);assert.equal(p.template.name,'booking_with_qr_new');
  assert.equal(p.template.components[0].parameters[0].image.id,'media-1');assert.equal(p.biz_opaque_callback_data,`${row.id}:${row.lock_token}`);
  assert.deepEqual(p.template.components[1].parameters.map(p=>p.parameter_name),['customer_name','booking_id','sport','booking_date','booking_time']);
  assert.equal(p.template.components[1].parameters[1].text,'#11111111');
  assert.equal(p.template.language.code,'en');
  assert.deepEqual(p.template.components[1].parameters.map(p=>p.text),['Player','#11111111','Pickleball','19 October 2026','7:00 PM - 8:00 PM']);
});
for(const phone of ['8572005698','+8572005698','918572005698','+918572005698','9123456789'])configured(`booking API recipient is digits only with country code exactly once: ${phone}`,async()=>{
  const expected=phone==='9123456789'?'919123456789':'918572005698';
  const h=harness({bookings:[booking({contact_phone:phone})]});
  const row=h.state.whatsapp_messages[0];
  assert.equal((await h.service.process(row.id)).ok,true);
  assert.equal(row.to_phone,`+${expected}`);assert.equal(row.payload.to,expected);assert.equal(h.calls.sent[0].to,expected);
  assert.match(h.calls.sent[0].to,/^91\d{10}$/);
});
configured('preparation failures still log the full +91 recipient',async()=>{
  const h=harness({client:{upload:()=>({ok:false,code:'HTTP_429',message:'Rate limited',retryable:true})}});
  const row=h.state.whatsapp_messages[0];await h.service.process(row.id);
  assert.equal(row.status,'failed');assert.equal(row.to_phone,'+918572005698');assert.equal(h.calls.sent.length,0);
});
configured('separate reservations never reuse each other\'s QR or media id',async()=>{
  const h=harness({rows:[message(),message('booking',id2)],bookings:[booking(),booking({id:id2})]});
  await Promise.all(h.state.whatsapp_messages.map(r=>h.service.process(r.id)));assert.equal(h.calls.sent.length,2);
  assert.notDeepEqual(h.calls.images[0].bytes,h.calls.images[1].bytes);
  assert.notEqual(h.calls.sent[0].template.components[0].parameters[0].image.id,h.calls.sent[1].template.components[0].parameters[0].image.id);
});
for(const kind of ['event','tournament'])configured(`${kind} QR uses its own category and activity date range`,async()=>{
  const activity={title:'Open Play',starts_on:'2026-10-19',ends_on:'2026-10-20',daily_start_time:'19:00:00',daily_end_time:'20:00:00',sports:{name:'Pickleball'},court_types:{sports:{name:'Pickleball'}}};
  const h=harness({rows:[message(kind)],tables:kind==='event'?{event_orders:[{id,status:'CONFIRMED',whatsapp_consent:true,contact_phone:'8572005698',attendee_name:'Player',events:activity}]}:{tournament_registrations:[{id,status:'CONFIRMED',whatsapp_consent:true,contact_phone:'8572005698',captain_name:'Player',tournaments:activity}]}});
  assert.equal((await h.service.process(h.state.whatsapp_messages[0].id)).ok,true);assert.equal(h.calls.images[0].filename,`${kind}-${id}.png`);
  assert.equal(h.calls.sent[0].to,'918572005698');assert.equal(h.state.whatsapp_messages[0].to_phone,'+918572005698');
  assert.equal(h.calls.sent[0].template.components[1].parameters[3].text,'19 October 2026 - 20 October 2026');
});
configured('concurrent worker and admin retries produce only one send',async()=>{
  const h=harness();const r=h.state.whatsapp_messages[0];await Promise.all([h.service.process(r.id),h.service.process(r.id),h.service.retryMessage(r.id)]);
  assert.equal(h.calls.sent.length,1);assert.equal(r.attempts,1);
});
for(const patch of [{status:'CANCELLED'},{whatsapp_consent:false},{contact_phone:'bad'}])configured(`ineligible reservation never sends ${JSON.stringify(patch)}`,async()=>{
  const h=harness({bookings:[booking(patch)]});await h.service.process(h.state.whatsapp_messages[0].id);assert.equal(h.calls.sent.length,0);assert.equal(h.state.whatsapp_messages[0].retryable,false);
});
configured('STOP suppresses even manual retries',async()=>{
  const h=harness({tables:{whatsapp_opt_outs:[{phone:'918572005698'}]}});await h.service.retryMessage(h.state.whatsapp_messages[0].id);
  assert.equal(h.calls.images.length,0);assert.equal(h.state.whatsapp_messages[0].error_code,'OPTED_OUT');
});
configured('definite retryable refusal reuses only this reservation\'s uploaded media',async()=>{
  let refused=true;const h=harness({client:{send:()=>refused?{ok:false,code:'HTTP_429',message:'Rate limited',retryable:true}:{ok:true,data:{messageId:'wamid.retry'}}}});
  const r=h.state.whatsapp_messages[0];await h.service.process(r.id);assert.equal(r.status,'failed');assert.equal(r.retryable,true);
  refused=false;await h.service.retryMessage(r.id);assert.equal(r.status,'sent');assert.equal(h.calls.images.length,1);
});
for(const code of ['NETWORK','TIMEOUT','NO_MESSAGE_ID','HTTP_500'])configured(`${code}: uncertain dispatch never gets a blind resend`,async()=>{
  const h=harness({client:{send:()=>({ok:false,code,message:'Uncertain',retryable:true})}});const r=h.state.whatsapp_messages[0];
  await h.service.process(r.id);await h.service.retryMessage(r.id);await h.service.drain();assert.equal(r.status,'unknown');assert.equal(h.calls.sent.length,1);assert.equal(r.retryable,false);
});
configured('three automatic attempts is the ceiling; definite failures allow manual recovery',async()=>{
  const h=harness({rows:[message('booking',id,{attempts:3,status:'failed'})]});const r=h.state.whatsapp_messages[0];
  assert.equal((await h.service.process(r.id)).ok,false);assert.equal((await h.service.retryMessage(r.id)).ok,true);assert.equal(r.attempts,4);
});
configured('early delivered receipt survives send response and old sent receipt',async()=>{
  let h;h=harness({client:{send:async(_c,p)=>{await h.service.applyStatusUpdate([{id:'wamid.early',status:'delivered',correlation:p.biz_opaque_callback_data}]);return {ok:true,data:{messageId:'wamid.early'}};}}});
  await h.service.process(h.state.whatsapp_messages[0].id);assert.equal(h.state.whatsapp_messages[0].status,'delivered');
  await h.service.applyStatusUpdate([{id:'wamid.early',status:'sent'}]);assert.equal(h.state.whatsapp_messages[0].status,'delivered');
});
configured('sent can become failed, but failed receipts never downgrade delivered/read',async()=>{
  const h=harness();const r=h.state.whatsapp_messages[0];await h.service.process(r.id);
  await h.service.applyStatusUpdate([{id:r.wa_message_id,status:'failed'}]);assert.equal(r.status,'failed');
  await h.service.applyStatusUpdate([{id:r.wa_message_id,status:'sent'}]);assert.equal(r.status,'failed');
  await h.service.applyStatusUpdate([{id:r.wa_message_id,status:'read'}]);await h.service.applyStatusUpdate([{id:r.wa_message_id,status:'failed'}]);assert.equal(r.status,'read');
});
configured('confirmation sends immediately without a response-tail callback or cron',async()=>{
  const h=harness();await h.service.sendBookingConfirmation(id);
  assert.equal(h.calls.sent.length,1);assert.equal(h.calls.images.length,1);assert.equal(h.calls.jobs.length,0);
  await h.service.sendBookingConfirmation(id);assert.equal(h.calls.sent.length,1);
});
configured('confirmation awaits upload and send before returning',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const h=harness({client:{send:async()=>{await gate;return {ok:true,data:{messageId:'wamid.awaited'}};}}});
  let completed=false;const pending=h.service.sendBookingConfirmation(id).then(()=>{completed=true;});
  await new Promise(resolve=>setTimeout(resolve,30));assert.equal(completed,false);
  release();await pending;assert.equal(h.state.whatsapp_messages[0].status,'sent');
});
configured('database failure during messaging cannot reject a confirmed booking',async()=>{
  const h=harness();h.failDb();
  await assert.doesNotReject(h.service.sendBookingConfirmation(id));assert.equal(h.calls.sent.length,0);
});
configured('Meta upload refusal is recorded without failing confirmation',async()=>{
  const h=harness({client:{upload:()=>({ok:false,code:'HTTP_401_190',message:'Invalid token',retryable:false})}});
  await assert.doesNotReject(h.service.sendBookingConfirmation(id));
  assert.equal(h.state.whatsapp_messages[0].status,'failed');assert.equal(h.calls.sent.length,0);
});
configured('a checkout without a consented delivery does not send',async()=>{
  const h=harness({rows:[]});await h.service.sendBookingConfirmation(id);
  assert.equal(h.calls.sent.length,0);assert.equal(h.calls.images.length,0);
});
test('unconfigured integration leaves the durable queue untouched',async()=>{
  const restore=setEnv({WHATSAPP_ACCESS_TOKEN:''});try{const h=harness();await h.service.process(h.state.whatsapp_messages[0].id);assert.equal(h.state.whatsapp_messages[0].attempts,0);assert.equal(h.calls.sent.length,0);}finally{restore();}
});

function receiptPayload(statuses=[],messages=[]){return {object:'whatsapp_business_account',entry:[{id:'54321',changes:[{field:'messages',value:{metadata:{phone_number_id:'12345'},statuses,messages}}]}]};}
function webhookRequest(payload,signed=true){const body=typeof payload==='string'?payload:JSON.stringify(payload);return new Request('https://example.com/api',{method:'POST',body,headers:{'x-hub-signature-256':signed?`sha256=${createHmac('sha256','test-secret').update(body).digest('hex')}`:'sha256=bad'}});}
configured('webhook handshake and signature verification reject unauthorized callbacks',async()=>{
  const h=harness();const route=h.load('src/app/api/v1/webhooks/whatsapp/route.ts');
  assert.equal(await (await route.GET(new Request('https://x.test/?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=123'))).text(),'123');
  assert.equal((await route.GET(new Request('https://x.test/?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=123'))).status,403);
  assert.equal((await route.POST(webhookRequest(receiptPayload(),false))).status,400);
});
configured('webhook correlates early receipts, persists STOP and returns 503 on DB failure',async()=>{
  const r=message('booking',id,{status:'sending',lock_token:randomUUID()});const h=harness({rows:[r]});const route=h.load('src/app/api/v1/webhooks/whatsapp/route.ts');
  const p=receiptPayload([{id:'wamid.callback',status:'delivered',biz_opaque_callback_data:`${r.id}:${r.lock_token}`}],[{from:'918572005698',type:'text',text:{body:' STOP '}}]);
  assert.equal((await route.POST(webhookRequest(p))).status,200);assert.equal(r.status,'delivered');assert.equal(h.state.whatsapp_opt_outs[0].phone,'918572005698');
  h.failDb();assert.equal((await route.POST(webhookRequest(p))).status,503);
});
configured('signed unrelated business callbacks and malformed payloads do not mutate deliveries',async()=>{
  const h=harness();const route=h.load('src/app/api/v1/webhooks/whatsapp/route.ts');const p=receiptPayload([],[{from:'918572005698',type:'text',text:{body:'STOP'}}]);
  p.entry[0].changes[0].value.metadata.phone_number_id='another';
  for(const value of [p,null,{entry:'invalid'},'{bad'])assert.equal((await route.POST(webhookRequest(value))).status,200);
  assert.equal(h.state.whatsapp_opt_outs.length,0);
});
test('Cloud API client posts multipart PNG to /media and exact template to /messages',async()=>{
  const original=globalThis.fetch;const calls=[];
  try{globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json(calls.length===1?{id:'media123'}:{messages:[{id:'wamid123'}]});};
    const {uploadMedia,sendTemplateMessage}=loader()('src/lib/whatsapp/client.ts');const config={token:'server-token',version:'v25.0',phoneNumberId:'12345'};
    assert.equal((await uploadMedia(config,{bytes:new Uint8Array([1,2]),type:'image/png',filename:'qr.png'})).data.mediaId,'media123');
    assert.equal(calls[0].url,'https://graph.facebook.com/v25.0/12345/media');assert.equal(calls[0].options.body.get('messaging_product'),'whatsapp');assert.equal(calls[0].options.body.get('file').type,'image/png');
    assert.equal(calls[0].options.headers.Authorization,'Bearer server-token');
    assert.equal(calls[0].options.body.get('type'),'image/png');
    assert.equal(calls[0].options.headers['Content-Type'],undefined,'fetch must set the multipart boundary');
    assert.equal((await sendTemplateMessage(config,{type:'template'})).data.messageId,'wamid123');assert.equal(calls[1].url,'https://graph.facebook.com/v25.0/12345/messages');assert.equal(calls[1].options.headers.Authorization,'Bearer server-token');
    assert.equal(calls[1].options.headers['Content-Type'],'application/json');
    assert.deepEqual(JSON.parse(calls[1].options.body),{type:'template'});
  }finally{globalThis.fetch=original;}
});
test('website integration retains consent, durable deduplication and immediate sending',()=>{
  const sql=readFileSync(resolve(root,'supabase/migrations/20261014150000_whatsapp_booking_qr.sql'),'utf8');
  assert.match(sql,/not new.whatsapp_consent/);assert.match(sql,/on conflict\(dedupe_key\) do nothing/);assert.match(sql,/for update skip locked/);
  for(const file of ['src/app/api/v1/user/bookings/route.ts','src/app/api/v1/user/events/[id]/tickets/route.ts','src/app/api/v1/user/tournaments/[id]/register/route.ts'])assert.match(readFileSync(resolve(root,file),'utf8'),/whatsappConsent/);
  for(const file of ['book/payment/page.tsx','event/[id]/page.tsx','tournament/[id]/page.tsx']){
    const text=readFileSync(resolve(root,'src/app/app',file),'utf8');assert.match(text,/<WhatsAppConsent\s/);assert.match(text,/whatsappConsent,/);
  }
  assert.doesNotMatch(readFileSync(resolve(root,'vercel.json'),'utf8'),/whatsapp-deliveries/);
  assert.doesNotMatch(readFileSync(resolve(root,'src/lib/services/whatsapp.service.ts'),'utf8'),/import.*after.*next\/server/);
});
test('every Vercel cron stays inside the Hobby once-per-day limit',()=>{
  const {crons}=JSON.parse(readFileSync(resolve(root,'vercel.json'),'utf8'));
  assert.equal(new Set(crons.map(cron=>cron.path)).size,crons.length,'Cron paths must not be scheduled twice');
  for(const path of ['/api/cron/booking-emails','/api/cron/push-deliveries','/api/cron/clear-expired','/api/cron/booking-reminders']){
    assert.ok(crons.some(cron=>cron.path===path),`${path} must retain its recovery schedule`);
  }
  for(const {path,schedule} of crons){
    const fields=schedule.split(' ');
    assert.equal(fields.length,5,`${path} must use a five-field cron expression`);
    for(const field of fields.slice(0,2))assert.match(field,/^\d{1,2}$/,
      `${path} schedule "${schedule}" would run more than once per day; Vercel Hobby only allows daily cron jobs`);
    assert.ok(Number(fields[0])<=59 && Number(fields[1])<=23,`${path} must have valid minute/hour values`);
    assert.deepEqual(fields.slice(2),['*','*','*'],`${path} must run every day`);
  }
});
for(const kind of ['event','tournament'])test(`${kind} QR checks payment/date and atomically rejects duplicate admission`,async()=>{
  const activity={status:'published',title:'Activity',starts_on:'2026-10-14',ends_on:'2026-10-14',daily_end_time:'22:00:00'};
  const row={id,status:'CONFIRMED',payment_status:'PAID',scanned_at:null,attendee_name:'Player',captain_name:'Player',contact_phone:'8572005698',tickets:2,team_name:'Team',events:activity,tournaments:activity};
  const h=harness({tables:{[kind==='event'?'event_orders':'tournament_registrations']:[row]}});
  const load=loader({'../db/supabase':{supabaseAdmin:h.db},'./booking.service':{BookingError:class extends Error{},BookingService:{}},'../utils/date-helpers':{wallClockIn:()=>({date:'2026-10-14',time:'19:00:00'})}});
  const service=load('src/lib/services/reservation-check-in.service.ts').ReservationCheckInService;
  assert.equal((await service.verify(`gameon:${kind}:${id}`)).success,true);
  await assert.rejects(service.verify(`gameon:${kind}:${id}`),/already checked in/);
  row.scanned_at=null;row.payment_status='UNPAID';await assert.rejects(service.verify(`gameon:${kind}:${id}`),/No valid/);
  row.payment_status='PAID';activity.starts_on='2026-10-15';await assert.rejects(service.verify(`gameon:${kind}:${id}`),/only valid/);
});
test('court QR delegates to existing court check-in service',async()=>{
  let received;
  const load=loader({'../db/supabase':{supabaseAdmin:{}},'./booking.service':{BookingService:{verifyQRCode:async code=>{received=code;return {success:true};}}}});
  assert.equal((await load('src/lib/services/reservation-check-in.service.ts').ReservationCheckInService.verify(id)).success,true);assert.equal(received,id);
});