'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ActionForm, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { addCourtTypeImage, deleteCourtTypeImage, moveCourtTypeImage } from '@/lib/admin/actions/catalog';

type Photo = { id: string; url: string };

/**
 * The court type's gallery: what the app's detail-screen carousel slides
 * through, in this order. The first photo is also the listing card's cover.
 */
export function CourtTypePhotos({ courtTypeId, name, photos }: { courtTypeId: string; name: string; photos: Photo[] }) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {photos.length === 0 ? (
        <p className="text-sm text-zinc-500">No photos yet — the app shows the sport&apos;s photo until you add one.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-lg border border-zinc-200">
              <div className="relative aspect-[4/3] bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seeded remote photo */}
                <img src={photo.url} alt={`${name} photo ${index + 1}`} className="size-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-1">
                  {index > 0 ? (
                    <ActionForm action={moveCourtTypeImage}>
                      <input type="hidden" name="imageId" value={photo.id} />
                      <input type="hidden" name="direction" value="up" />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                        <ArrowUp className="size-3.5" aria-hidden />
                        <span className="sr-only">Move earlier</span>
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                  {index < photos.length - 1 ? (
                    <ActionForm action={moveCourtTypeImage}>
                      <input type="hidden" name="imageId" value={photo.id} />
                      <input type="hidden" name="direction" value="down" />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                        <ArrowDown className="size-3.5" aria-hidden />
                        <span className="sr-only">Move later</span>
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
                <ActionForm action={deleteCourtTypeImage}>
                  <input type="hidden" name="imageId" value={photo.id} />
                  <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                    <Trash2 className="size-3.5" aria-hidden />
                    <span className="sr-only">Remove photo</span>
                  </SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionForm
        action={addCourtTypeImage}
        onSuccess={() => setPicked(null)}
        resetOnSuccess
        className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4">
        <FormMessage />
        <input type="hidden" name="courtTypeId" value={courtTypeId} />
        {picked ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
          <img src={picked} alt="Chosen photo" className="h-12 w-16 rounded-md object-cover" />
        ) : null}
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={`Add a photo to ${name}`}
          className="max-w-60 text-xs text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPicked(file ? URL.createObjectURL(file) : null);
          }}
        />
        {picked ? (
          <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading…">
            Add photo
          </SubmitButton>
        ) : null}
        <p className="w-full text-xs text-zinc-500">JPG, PNG or WebP, up to 3 MB. Up to 10 photos.</p>
      </ActionForm>
    </div>
  );
}
