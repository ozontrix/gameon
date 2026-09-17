'use client';

import { useRef, useState } from 'react';

import { ActionForm, SubmitButton } from '@/components/admin/action-form';
import { saveSportImage } from '@/lib/admin/actions/content';

/** Photo for a sport's "Trending now" card in the app. */
export function SportImageForm({ sportId, sportName, imageUrl }: { sportId: string; sportName: string; imageUrl: string | null }) {
  const [picked, setPicked] = useState<string | null>(null);
  const removeRef = useRef<HTMLInputElement>(null);
  const shown = picked ?? imageUrl;

  return (
    <ActionForm action={saveSportImage} onSuccess={() => setPicked(null)} resetOnSuccess className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="sportId" value={sportId} />
      <input ref={removeRef} type="hidden" name="remove" value="false" />
      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded image or a local preview
          <img src={shown} alt={`${sportName} photo`} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[10px] text-zinc-400">App photo</span>
        )}
      </div>
      <input
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={`Photo for ${sportName}`}
        className="max-w-52 text-xs text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPicked(file ? URL.createObjectURL(file) : null);
          if (removeRef.current) removeRef.current.value = 'false';
        }}
      />
      {picked ? (
        <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading…">
          Upload
        </SubmitButton>
      ) : imageUrl ? (
        <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…" name="remove" value="true">
          Remove
        </SubmitButton>
      ) : null}
    </ActionForm>
  );
}
