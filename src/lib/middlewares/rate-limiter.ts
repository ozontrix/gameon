import { NextResponse } from 'next/server';

// Simple in-memory rate limiter
// NOTE: In production (especially in serverless environments like Vercel),
// this memory will reset on cold starts and won't be shared across edge nodes.
// Use Redis (e.g., @upstash/redis) for production.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

interface RateLimitOptions {
  limit: number; // e.g., 5 requests
  windowMs: number; // e.g., 60000 (1 minute)
}

export function withRateLimit(
  request: Request,
  options: RateLimitOptions,
  handler: (request: Request) => Promise<NextResponse>
) {
  // Try to get IP address
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown-ip';
             
  const now = Date.now();
  const windowData = rateLimitMap.get(ip);

  if (!windowData) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
  } else {
    // Reset window if time passed
    if (now - windowData.lastReset > options.windowMs) {
      rateLimitMap.set(ip, { count: 1, lastReset: now });
    } else {
      windowData.count++;
      if (windowData.count > options.limit) {
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }
  }

  // Optional: cleanup old entries periodically to prevent memory leak
  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now - val.lastReset > options.windowMs * 2) {
        rateLimitMap.delete(key);
      }
    }
  }

  return handler(request);
}
