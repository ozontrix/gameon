# Brevo email delivery

All website/API transactional senders use `src/lib/email/smtp.ts`: newsletter and
early-access staff notifications, paid league confirmations (including staff BCC),
open-play confirmations/retries and account-deletion staff/user messages.
Mobile clients using these APIs inherit the same transport. No Gmail fallback exists.
Existing recipient lists, reply-to addresses, templates and durable booking/registration
behavior are preserved. SMTP acceptance is not proof of inbox delivery.

## Local and Vercel configuration

The local configuration is in the Git-ignored `.env.local`. In the Vercel website
project, add/update these server-only variables for Production (and Preview and
Development if those deployments should send email):

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `bdc111001@smtp-brevo.com` |
| `SMTP_PASSWORD` | Your Brevo **SMTP key**, not an API key |
| `SMTP_FROM_EMAIL` | `info@gameonmultisports.com` (verify in Brevo first) |
| `SMTP_FROM_NAME` | `GameOn Multi Sports` |
| `NOTIFY_RECIPIENTS` | Keep the existing comma-separated staff recipients |

Delete obsolete `SMTP_APP_PASSWORD`. Do not add `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
prefixes to any SMTP settings. Deploy this code with the updated variables;
environment changes do not update existing Vercel deployments. Restart the local
development server after updating `.env.local`.

Port 587 uses STARTTLS with `requireTLS: true`; certificate validation is not
disabled. Missing credentials or sender configuration fail closed. The technical
`@smtp-brevo.com` login must not be used as a From address.

## Brevo setup

1. Verify `info@gameonmultisports.com`, or authenticate `gameonmultisports.com`
   using the DNS records provided by Brevo. Do not invent DNS record values or
   overwrite existing mail-provider records.
2. Confirm transactional sending is activated and sufficient credits are available.
3. Disable link/click tracking for authentication emails so verification links
   are not rewritten.
4. The SMTP key was shared in chat. Rotate it in Brevo, update `SMTP_PASSWORD`
   locally and in Vercel and the Supabase SMTP password, then redeploy.

## Supabase Auth: required separately for app email signup

Signup verification/resend and other Supabase Auth emails are sent by Supabase,
not the Next.js SMTP helper. Vercel variables alone cannot migrate these emails.
In the Supabase project dashboard, open **Authentication → Emails → SMTP Settings**,
enable custom SMTP, and save:

| Setting | Value |
| --- | --- |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | `bdc111001@smtp-brevo.com` |
| Password | Your Brevo SMTP key |
| Sender email | `info@gameonmultisports.com` |
| Sender name | `GameOn Multi Sports` |

Preserve existing confirmation templates, Confirm email and redirect URL settings.
Review Supabase Auth rate limits against your expected signup volume and Brevo plan.
Never put SMTP credentials into the mobile app. No app rebuild is required just
to change the Supabase SMTP provider. This dashboard change is not performed by
the repository migration.

## Production-only failures

The old `email was not accepted by SMTP` log discarded the underlying exception.
It did not prove that Brevo rejected the message: connection and authentication
errors produced the same log. Open play and league failures now save a fixed,
actionable diagnostic for admins, and all three flows log allowlisted protocol
fields (`reason`, `code`, `responseCode`, `command`). Credentials, raw provider
responses and recipient details are not logged or returned to public clients.

Check the new Production deployment's function log after one failed attempt:

| Diagnostic | Action |
| --- | --- |
| `IP_NOT_AUTHORIZED`, SMTP `525` | If Brevo SMTP IP blocking is enabled, authorize the hosting server's actual outbound IP under Settings → Security → Authorized IPs. Do not assume your laptop IP or website DNS IP is the outbound IP. Keep IP protection enabled; use a hosting/network configuration with known outbound IPs if necessary. |
| `AUTHENTICATION`, SMTP `535` | Recheck the Production SMTP login and SMTP key. An API key or Brevo account password cannot be used as `SMTP_PASSWORD`. |
| `SENDER_REJECTED` | Confirm the exact `SMTP_FROM_EMAIL` sender and its domain authentication in Brevo. Adding a domain without completing verification is not enough. |
| `ACCOUNT_RESTRICTED` / `SENDING_LIMIT` | Check transactional sending activation, suspension notices, credits and sending limits. |
| `CONNECTION` | Check outbound network access. Brevo supports 587 (STARTTLS), 465 (TLS) and 2525 (STARTTLS); update the port only when the logs indicate a connection problem and redeploy. |
| `RECIPIENT_REJECTED` | Check the recipient and Brevo blocked-contact logs. Newsletter/early-access notifications go to `NOTIFY_RECIPIENTS`, not to the subscriber. |

Matching surrounding quotes pasted into SMTP environment values are normalized.
Multiline settings, Brevo API keys and unsupported Brevo ports fail closed. No
insecure TLS bypass, automatic credential fallback or duplicate-send retry is used.

Environment changes require a new Vercel deployment. Existing failures will not
automatically resend; use the Open Play/league admin retry controls after fixing
the configuration. Failed newsletter requests must be submitted again.

## Validation commands

```sh
node --test scripts/test-smtp.mjs scripts/test-delete-account.mjs scripts/test-open-play.mjs scripts/test-league-flow.mjs scripts/test-league-bookings.mjs
node --conditions=react-server scripts/verify-smtp.mjs
node --conditions=react-server scripts/verify-smtp.mjs --send-to-self
npm run build
```

The tests mock SMTP and send no emails. The verification script uses local
credentials to check the SMTP connection and authentication, without sending
mail by default. The explicit `--send-to-self` flag sends one diagnostic to
`SMTP_FROM_EMAIL` only; it creates no customer registration or subscription.
SMTP acceptance still does not prove inbox delivery. After deployment,
submit one real website form/open-play registration and request a fresh app
signup-confirmation email. Check delivery and Brevo transactional logs. Retry
failed saved registration/league emails through the existing admin controls.

Official references:
- https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP
- https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP
- https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://vercel.com/docs/environment-variables