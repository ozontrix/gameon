-- Image-first hero carousel; keep existing copy so admins can re-enable it.
alter table public.home_banners
  add column show_text boolean not null default false;

alter table public.home_banners drop constraint home_banners_title_check;
alter table public.home_banners add constraint home_banners_title_check
  check (char_length(title) <= 60 and (placement = 'HERO' or char_length(btrim(title)) >= 1));
alter table public.home_banners alter column title set default '';

comment on column public.home_banners.show_text is
  'Hero carousel copy visibility. False hides all copy and its scrim without deleting saved text. Promo cards ignore this setting.';