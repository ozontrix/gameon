import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/services/whatsapp.service';

/**
 * Durable recovery worker for WhatsApp QR deliveries.
 *
 * Vercel Hobby only allows cron jobs that run once per day, so this route no
 * longer relies on a five-minute schedule: a single run keeps draining in
 * batches until the queue is empty or the time budget is spent, inside the
 * 300 second function limit. Anything left over is picked up by the next run.
 *
 * The happy path still sends in the request tail (WhatsAppService.schedule);
 * this endpoint is the safety net for failures, retries and crashed workers.
 * For faster recovery than once a day, point an external scheduler at this same
 * authenticated URL every few minutes.
 */
export const maxDuration = 300;
const BATCH_SIZE = 25;
const MAX_BATCHES = 8;
const TIME_BUDGET_MS = 240_000;

export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  if(!secret || request.headers.get('authorization')!==`Bearer ${secret}`)
    return NextResponse.json({error:'Unauthorized'},{status:401});
  const startedAt=Date.now();
  try {
    let processed=0;let batches=0;let drained=false;
    while(batches<MAX_BATCHES && Date.now()-startedAt<TIME_BUDGET_MS) {
      const result=await WhatsAppService.drain(BATCH_SIZE);
      if(!result.configured) return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
      processed+=result.processed;batches++;
      if(result.processed<BATCH_SIZE) { drained=true;break; } // Fewer rows than the batch size means the queue is empty.
    }
    return NextResponse.json({configured:true,processed,batches,drained},{headers:{'Cache-Control':'no-store'}});
  }
  catch { return NextResponse.json({error:'Delivery worker unavailable'},{status:503}); }
}