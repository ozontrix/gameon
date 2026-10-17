import { supabaseAdmin } from '../db/supabase';
import type { Tables, Json } from '@/types/database.types';
import { getWhatsAppConfig } from '../whatsapp/config';
import { sendTemplateMessage, uploadMedia } from '../whatsapp/client';
import { toWhatsAppNumber } from '../whatsapp/phone';
import { generateBookingQr, type QrCategory } from '../whatsapp/qr';
import { bookingTimeRange, buildTemplatePayload, longDate } from '../whatsapp/template';

type Message = Tables<'whatsapp_messages'>;
export type WhatsAppCategory = QrCategory;
type Delivery = { phone: string; name: string; sport: string; date: string; time: string };
export function referenceFor(_category: QrCategory, id: string) { return `#${id.slice(0,8).toUpperCase()}`; }

export class WhatsAppService {
  /** Send immediately after confirmation commits; messaging must never undo a booking. */
  static async sendBookingConfirmation(id: string) { await WhatsAppService.sendConfirmation('booking', id); }
  static async sendEventConfirmation(id: string) { await WhatsAppService.sendConfirmation('event', id); }
  static async sendTournamentConfirmation(id: string) { await WhatsAppService.sendConfirmation('tournament', id); }
  private static async sendConfirmation(category: QrCategory, id: string) {
    try {
      // The existing transactional row supplies consent, logging and a dedupe lease,
      // not a scheduled job. No cron or response-tail callback is needed to send.
      const { data, error } = await supabaseAdmin.from('whatsapp_messages').select('id')
        .eq('dedupe_key',`${category}-confirmed:${id}`).maybeSingle();
      if (error) throw error;
      if (data) {
        const result = await WhatsAppService.process(data.id);
        if (!result.ok) console.warn('[whatsapp] confirmation not sent; inspect delivery log',category,id);
      }
    } catch {
      // Do not expose provider errors, tokens or customer details in checkout/logs.
      console.error('[whatsapp] confirmation delivery failed; booking remains confirmed',category,id);
    }
  }

  private static async loadDelivery(category: QrCategory, id: string): Promise<Delivery | null> {
    if (category==='booking') {
      const {data,error}=await supabaseAdmin.from('bookings')
        .select('status, whatsapp_consent, contact_phone, contact_name, booking_date, start_time, end_time, facilities (name, court_types (sports (name)))')
        .eq('id',id).maybeSingle();
      if(error) throw error;
      if(!data || data.status!=='CONFIRMED' || !data.whatsapp_consent) return null;
      return {phone:data.contact_phone||'',name:data.contact_name||'Player',sport:data.facilities?.court_types?.sports?.name||'Court booking',
        date:longDate(data.booking_date),time:bookingTimeRange(data.start_time,data.end_time)};
    }
    if(category==='event') {
      const {data,error}=await supabaseAdmin.from('event_orders')
        .select('status, whatsapp_consent, contact_phone, attendee_name, events (title, starts_on, ends_on, daily_start_time, daily_end_time, sports (name))')
        .eq('id',id).maybeSingle();
      if(error) throw error;
      if(!data || data.status!=='CONFIRMED' || !data.whatsapp_consent) return null;
      const e=data.events;
      return {phone:data.contact_phone,name:data.attendee_name,sport:[e?.sports?.name,e?.title].filter(Boolean).join(' - ')||'Event',
        date:WhatsAppService.dateRange(e?.starts_on,e?.ends_on),time:bookingTimeRange(e?.daily_start_time,e?.daily_end_time)};
    }
    const {data,error}=await supabaseAdmin.from('tournament_registrations')
      .select('status, whatsapp_consent, contact_phone, captain_name, tournaments (title, starts_on, ends_on, daily_start_time, daily_end_time, court_types (sports (name)))')
      .eq('id',id).maybeSingle();
    if(error) throw error;
    if(!data || data.status!=='CONFIRMED' || !data.whatsapp_consent) return null;
    const t=data.tournaments;
    return {phone:data.contact_phone,name:data.captain_name,sport:[t?.court_types?.sports?.name,t?.title].filter(Boolean).join(' - ')||'Tournament',
      date:WhatsAppService.dateRange(t?.starts_on,t?.ends_on),time:bookingTimeRange(t?.daily_start_time,t?.daily_end_time)};
  }
  private static dateRange(start?: string,end?: string) { return start && end && start!==end ? `${longDate(start)} - ${longDate(end)}`:longDate(start); }

  /** DB lease covers cron, response-tail work and manual retries simultaneously. */
  static async process(id: string, force=false): Promise<{ok:boolean;message:string}> {
    const config=getWhatsAppConfig();
    if(!config) return {ok:false,message:'WhatsApp server credentials are missing or invalid.'};
    const {data,error}=await supabaseAdmin.rpc('claim_whatsapp_delivery',{p_id:id,p_force:force});
    if(error) throw error;
    if(!data) return {ok:false,message:'Already sent, in progress, uncertain, or not eligible for retry.'};
    const row=data as unknown as Message;
    let dispatched=false;
    try {
      const delivery=await WhatsAppService.loadDelivery(row.category as QrCategory,row.reference_id);
      if(!delivery) return await WhatsAppService.failure(row,'INELIGIBLE','Booking cancelled, removed, or messaging permission missing.',false);
      const to=toWhatsAppNumber(delivery.phone);
      if(!to) return await WhatsAppService.failure(row,'INVALID_PHONE','The booking phone is not a valid WhatsApp number.',false);
      const recipient=`+${to}`;
      // Keep the display/log number international; Meta's payload uses digits only.
      await WhatsAppService.updateOwned(row,{to_phone:recipient},['processing']);
      const optOut=await supabaseAdmin.from('whatsapp_opt_outs').select('phone').eq('phone',to).maybeSingle();
      if(optOut.error) throw optOut.error;
      if(optOut.data) return await WhatsAppService.failure(row,'OPTED_OUT','Recipient opted out of WhatsApp messages.',false);

      let mediaId=row.media_id;
      if(!mediaId || !row.media_uploaded_at || Date.now()-Date.parse(row.media_uploaded_at)>25*86400000) {
        const image=await generateBookingQr(row.category as QrCategory,row.reference_id);
        const uploaded=await uploadMedia(config,image);
        if(!uploaded.ok) return await WhatsAppService.failure(row,uploaded.code,uploaded.message,uploaded.retryable);
        mediaId=uploaded.data.mediaId;
        await WhatsAppService.updateOwned(row,{media_id:mediaId,media_uploaded_at:new Date().toISOString()});
      }
      const payload=buildTemplatePayload(config,{to,mediaId,customerName:delivery.name,
        bookingId:referenceFor(row.category as QrCategory,row.reference_id),sport:delivery.sport,date:delivery.date,time:delivery.time});
      // Save correlation BEFORE dispatch; early webhooks can find the local row.
      const correlated={...payload,biz_opaque_callback_data:`${row.id}:${row.lock_token}`};
      await WhatsAppService.updateOwned(row,{status:'sending',locked_until:new Date(Date.now()+120000).toISOString(),to_phone:recipient,template_name:config.templateName,language:config.language,payload:correlated as unknown as Json},['processing']);
      dispatched=true;
      const sent=await sendTemplateMessage(config,correlated);
      if(!sent.ok) {
        const uncertain=['TIMEOUT','NETWORK','NO_MESSAGE_ID'].includes(sent.code)||/^HTTP_5\d\d/.test(sent.code);
        return await WhatsAppService.failure(row,sent.code,sent.message,uncertain?false:sent.retryable,uncertain);
      }
      const saved=await supabaseAdmin.from('whatsapp_messages').update({wa_message_id:sent.data.messageId,sent_at:new Date().toISOString()})
        .eq('id',row.id).eq('lock_token',row.lock_token!);
      if(saved.error) throw saved.error;
      // Do not downgrade an early delivered/read webhook to sent.
      const advanced=await supabaseAdmin.from('whatsapp_messages').update({status:'sent',retryable:false,locked_until:null})
        .eq('id',row.id).eq('lock_token',row.lock_token!).eq('status','sending');
      if(advanced.error) throw advanced.error;
      return {ok:true,message:'QR confirmation accepted by Meta. Delivery is tracked separately.'};
    } catch {
      return await WhatsAppService.failure(row,dispatched?'UNCERTAIN_SEND':'PREPARATION_FAILED',
        dispatched?'Delivery may have been accepted. Check Meta before resending.':'QR preparation failed; inspect the delivery log before retrying.',!dispatched,dispatched);
    }
  }
  private static async updateOwned(row:Message,patch:Partial<Message>,statuses?:string[]) {
    let q=supabaseAdmin.from('whatsapp_messages').update(patch).eq('id',row.id).eq('lock_token',row.lock_token!);
    if(statuses) q=q.in('status',statuses);
    const {data,error}=await q.select('id').maybeSingle();
    if(error) throw error;
    if(!data) throw new Error('Delivery lease was lost or a receipt already advanced this delivery.');
  }
  private static async failure(row:Message,code:string,message:string,retryable:boolean,unknown=false) {
    await WhatsAppService.updateOwned(row,{status:unknown?'unknown':'failed',error_code:code,error_message:message.slice(0,300),retryable,
      failed_at:new Date().toISOString(),locked_until:null,next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**row.attempts)).toISOString()},['processing','sending']);
    return {ok:false,message};
  }

  static async applyStatusUpdate(updates: {id:string;status:string;timestamp?:string;correlation?:string;error?:{code?:number|string;title?:string;message?:string}}[]) {
    let applied=0;
    for(const update of updates) {
      if(!['sent','delivered','read','failed'].includes(update.status)) continue;
      const millis=Number(update.timestamp)*1000;
      const at=Number.isFinite(millis)&&millis>0&&millis<=8.64e15?new Date(millis).toISOString():new Date().toISOString();
      const {data,error}=await supabaseAdmin.rpc('whatsapp_apply_receipt',{
        p_message_id:update.id,p_status:update.status,p_at:at,p_correlation:update.correlation||null,
        p_error_code:update.error?.code?String(update.error.code):null,
        p_error_message:update.error?.title||'Meta could not deliver the message.',
      });
      if(error) throw error; // Return 503 from webhook; Meta must retry failed writes.
      if(data) applied++;
    }
    return applied;
  }
  static async retryMessage(id:string) { return WhatsAppService.process(id,true); }

  static async drain(limit=10) {
    if(!getWhatsAppConfig()) return {configured:false,processed:0};
    const recovery=await supabaseAdmin.rpc('whatsapp_recover_stale');
    if(recovery.error) throw recovery.error;
    const {data,error}=await supabaseAdmin.from('whatsapp_messages').select('id')
      .in('status',['queued','processing','sending','failed']).eq('retryable',true).not('consent_at','is',null)
      .lt('attempts',3).lte('next_attempt_at',new Date().toISOString()).order('created_at').limit(limit);
    if(error) throw error;
    for(const row of data??[]) {
      try { await WhatsAppService.process(row.id); }
      catch { console.error('[whatsapp] worker deferred delivery',row.id); }
    }
    return {configured:true,processed:data?.length??0};
  }

  static async listMessages(options:{status?:string;category?:string;page:number;limit:number}) {
    let q=supabaseAdmin.from('whatsapp_messages').select('*',{count:'exact'});
    if(options.status) q=q.eq('status',options.status);
    if(options.category) q=q.eq('category',options.category);
    const from=(options.page-1)*options.limit;
    const {data,count,error}=await q.order('created_at',{ascending:false}).order('id').range(from,from+options.limit-1);
    if(error) throw error;
    return {rows:data??[],total:count??0};
  }
  static async stats() {
    const keys=['queued','sent','delivered','read','failed','skipped','unknown'] as const;
    const values=await Promise.all(keys.map(async status=>{
      const {count,error}=await supabaseAdmin.from('whatsapp_messages').select('id',{count:'exact',head:true}).eq('status',status);
      if(error) throw error;
      return [status,count??0] as const;
    }));
    const {count,error}=await supabaseAdmin.from('whatsapp_messages').select('id',{count:'exact',head:true});
    if(error) throw error;
    return {total:count??0,...Object.fromEntries(values)} as {total:number}&Record<typeof keys[number],number>;
  }
}