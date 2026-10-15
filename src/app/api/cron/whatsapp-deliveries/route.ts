import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/services/whatsapp.service';

export const maxDuration = 300;
export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  if(!secret || request.headers.get('authorization')!==`Bearer ${secret}`)
    return NextResponse.json({error:'Unauthorized'},{status:401});
  try { return NextResponse.json(await WhatsAppService.drain(5),{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({error:'Delivery worker unavailable'},{status:503}); }
}