/** Copy and its contrast overlay must appear together, never over an empty slide. */
export function hasBannerText(banner: {
  showText?: boolean;
  title?: string | null;
  titleAccent?: string | null;
  subtitle?: string | null;
}): boolean {
  return banner.showText === true && [banner.title, banner.titleAccent, banner.subtitle]
    .some(value => Boolean(value?.trim()));
}