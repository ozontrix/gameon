# Home carousel: optional text

In **Admin → Home banners**, create or edit a **Hero slide (top carousel)**.

- Upload an image and leave **Show text on this slide** off for an image-only slide.
- Turn it on to display any combination of headline, second line and subtitle.
- All three text fields are optional for hero slides. Empty or whitespace-only copy
  never renders a dark gradient, even when the switch is on.
- Turning the switch off preserves saved copy for later. The preview updates
  immediately; save the banner to publish the choice.
- The list marks hero slides as **Image only** or **Text on**. A slide without a
  headline still has a usable edit link.
- Images, tap links, ordering, active state and schedules work as before.
- Promo cards are unchanged and still require a headline.

## Deployment

The migration adds `home_banners.show_text` (default `false`) and permits empty
hero headlines. Existing hero copy is retained but switched off. Apply the
`optional_hero_banner_text` migration before deploying the updated backend.
It has already been applied to the connected Supabase project.

Deploy the updated web/backend and distribute the updated Expo app together.
The public home response includes `showText`; hidden hero copy is omitted from
the public response but remains editable in admin. Older installed apps cannot
conditionally remove their always-on gradient and need the updated JavaScript.
The home endpoint has shared-cache headers, and clients refresh home content on
resume; allow cached responses to expire when checking a saved change.

## Validation

Run `node --test scripts/test-banner-text.mjs` separately in each repository.
The web tests exercise the renderer, admin saving/preview and public service.
The Expo tests exercise the renderer with mocked Android and iOS native UI.
They do not replace real-device visual acceptance.

After deployment, check an image-only slide, a text slide and an enabled-but-empty
slide on web, Android and iOS. Verify full-brightness images without copy,
readable text with its gradient, working tap links and unchanged pagination.