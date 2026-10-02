import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AccountDeletionSchema } from "@/lib/account-deletion";
import { sendAccountDeletionRequest } from "@/lib/account-deletion-email";
import { withRateLimit } from "@/lib/middlewares/rate-limiter";

export const runtime = "nodejs";

/** A public support request, not an authenticated account-deletion operation. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ success: false, error: "Please submit this request from our website." }, { status: 403 });
  }
  return withRateLimit(request, { limit: 3, windowMs: 15 * 60_000, keyPrefix: "delete-account" }, async (req) => {
    try {
      const body = await req.text();
      if (body.length > 12000) {
        return NextResponse.json({ success: false, error: "Your request is too long." }, { status: 413 });
      }
      let input: unknown;
      try { input = JSON.parse(body); } catch {
        return NextResponse.json({ success: false, error: "Please submit a valid request." }, { status: 400 });
      }
      const parsed = AccountDeletionSchema.safeParse(input);
      if (!parsed.success) {
        const fields = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]));
        return NextResponse.json({ success: false, error: "Please check the highlighted fields.", fields }, { status: 400 });
      }
      const reference = `DEL-${randomUUID().toUpperCase()}`;
      const result = await sendAccountDeletionRequest(parsed.data, reference);
      if (!result.accepted) {
        return NextResponse.json({ success: false, error: "We could not send your request. Please try again or email info@gameonmultisports.com directly." }, { status: result.unavailable ? 503 : 502 });
      }
      return NextResponse.json({ success: true, reference, copySent: result.copySent }, { status: 200 });
    } catch {
      return NextResponse.json({ success: false, error: "Unable to send your request right now. Please try again later." }, { status: 500 });
    }
  });
}