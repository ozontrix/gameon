'use client';

import { useEffect, useState } from 'react';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { checkboxClass, inputClass, textareaClass } from '@/components/admin/ui';
import { saveBanner } from '@/lib/admin/actions/content';

export type BannerFormValues = {
  id: string;
  placement: 'HERO' | 'PROMO';
  title: string;
  title_accent: string | null;
  subtitle: string | null;
  badge: string | null;
  image_url: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  /** `YYYY-MM-DDTHH:MM` on the venue's clock */
  starts_at: string;
  ends_at: string;
};

/** Routes the app can open, offered as suggestions. */
const APP_ROUTES = [
  '/sports',
  '/sports?sport=badminton',
  '/sports?sport=pickleball',
  '/sports?sport=cricket',
  '/sports?sport=football',
  '/bookings',
  '/events',
  '/accounts/wallet',
  '/accounts/refer-and-earn',
];

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

export function BannerForm({ banner }: { banner?: BannerFormValues }) {
  const [placement, setPlacement] = useState<'HERO' | 'PROMO'>(banner?.placement ?? 'HERO');
  const [preview, setPreview] = useState<string | null>(banner?.image_url ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [title, setTitle] = useState(banner?.title ?? '');
  const [accent, setAccent] = useState(banner?.title_accent ?? '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '');
  const [badge, setBadge] = useState(banner?.badge ?? '');
  const hero = placement === 'HERO';

  // Release the object URL of a picked file when it is replaced.
  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <ActionForm action={saveBanner} className="space-y-4 lg:col-span-3">
        {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
        <FormMessage />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-800">Placement</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="placement" value="HERO" checked={hero} onChange={() => setPlacement('HERO')} />
              Hero slide (top carousel)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="placement" value="PROMO" checked={!hero} onChange={() => setPlacement('PROMO')} />
              Promo card (below quick actions)
            </label>
          </div>
        </fieldset>

        {!hero ? (
          <div className="space-y-1.5">
            <Label htmlFor="title_accent">Label above the headline</Label>
            <input id="title_accent" name="title_accent" value={accent} onChange={(e) => setAccent(e.target.value)} maxLength={60} placeholder="WEEKEND OFFER" className={inputClass} />
            <FieldError name="title_accent" />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="title" required>
            Headline
          </Label>
          <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={hero ? 'Play More.' : 'Book now & save more'} className={inputClass} />
          <FieldError name="title" />
        </div>

        {hero ? (
          <div className="space-y-1.5">
            <Label htmlFor="title_accent">Second line (brand colour)</Label>
            <input id="title_accent" name="title_accent" value={accent} onChange={(e) => setAccent(e.target.value)} maxLength={60} placeholder="Book Easy." className={inputClass} />
            <FieldError name="title_accent" />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="subtitle">{hero ? 'Subtitle' : 'Details'}</Label>
          <textarea id="subtitle" name="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={160} rows={2} className={textareaClass} />
          <FieldError name="subtitle" />
        </div>

        {!hero ? (
          <div className="space-y-1.5">
            <Label htmlFor="badge">Badge</Label>
            <input id="badge" name="badge" value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={20} placeholder="10% OFF" className={inputClass} />
            <p className="text-xs text-zinc-500">Promo codes are not applied at checkout yet — don&apos;t advertise a code customers can&apos;t use.</p>
            <FieldError name="badge" />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="image" required={hero}>
            Image
          </Label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setPreview(URL.createObjectURL(file));
                setRemoveImage(false);
              }
            }}
          />
          <p className="text-xs text-zinc-500">JPG, PNG or WebP, up to 3 MB. Landscape, about 2:1, works best for hero slides.</p>
          {banner?.image_url && !hero ? (
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="remove_image"
                checked={removeImage}
                onChange={(event) => {
                  setRemoveImage(event.target.checked);
                  setPreview(event.target.checked ? null : banner.image_url);
                }}
                className={checkboxClass}
              />
              Remove the current image
            </label>
          ) : null}
          <FieldError name="image" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="link">Opens in the app</Label>
          <input id="link" name="link" list="app-routes" defaultValue={banner?.link ?? ''} placeholder="/sports" className={inputClass} />
          <datalist id="app-routes">
            {APP_ROUTES.map((route) => (
              <option key={route} value={route} />
            ))}
          </datalist>
          <FieldError name="link" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sort_order">Order</Label>
            <input id="sort_order" name="sort_order" type="number" min={0} max={9999} defaultValue={banner?.sort_order ?? 10} className={inputClass} />
            <p className="text-xs text-zinc-500">Lower shows first.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="starts_at">Show from (IST)</Label>
            <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={banner?.starts_at} className={inputClass} />
            <FieldError name="starts_at" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ends_at">Show until (IST)</Label>
            <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={banner?.ends_at} className={inputClass} />
            <FieldError name="ends_at" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-800">
          <input type="checkbox" name="is_active" defaultChecked={banner ? banner.is_active : true} className={checkboxClass} />
          Active
        </label>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Saving…">{banner ? 'Save banner' : 'Create banner'}</SubmitButton>
        </div>
      </ActionForm>

      {/* Approximate preview of how the app renders it */}
      <div className="lg:col-span-2">
        <p className="mb-2 text-sm font-medium text-zinc-800">Preview</p>
        {hero ? (
          <div className="relative aspect-[2.05] overflow-hidden rounded-xl bg-zinc-800">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob or any uploaded/remote URL
              <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
            <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center gap-1 p-4">
              <p className="truncate text-xl font-bold text-white">{title || 'Headline'}</p>
              <p className="truncate text-xl font-bold text-go-brand">{accent}</p>
              <p className="line-clamp-2 text-xs text-zinc-200">{subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-zinc-900 p-4">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob or any uploaded/remote URL
              <img src={preview} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-40" />
            ) : null}
            <div className="relative space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-go-brand">{accent}</p>
                {badge ? <span className="rounded-full bg-go-brand px-2 py-0.5 text-xs font-bold text-zinc-950">{badge}</span> : null}
              </div>
              <p className="text-lg font-bold text-white">{title || 'Headline'}</p>
              <p className="text-xs text-zinc-300">{subtitle}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
