import { categoryDates, entryTickets, findCategory, findSport, type Category, type SportId } from "./data";

/** Category ids are unique within a sport, not across sports. */
export interface CartSelection { sportId: SportId; categoryId: string }
export interface CartCategory extends Category { sportId: SportId; sportName: string }

export function selectionKey(selection: CartSelection): string {
  return `${selection.sportId}:${selection.categoryId}`;
}

export function normalizeSelections(input: unknown): CartSelection[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const selections: CartSelection[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const sport = findSport(item.sportId);
    const category = findCategory(sport, item.categoryId);
    if (!sport || !category) continue;
    const selection = { sportId: sport.id, categoryId: category.id };
    const key = selectionKey(selection);
    if (seen.has(key)) continue;
    seen.add(key);
    selections.push(selection);
  }
  return selections;
}

export function cartCategories(selections: CartSelection[]): CartCategory[] {
  return normalizeSelections(selections).map(({ sportId, categoryId }) => {
    const sport = findSport(sportId)!;
    return { ...findCategory(sport, categoryId)!, sportId, sportName: sport.name };
  });
}

export function replaceSportSelections(current: CartSelection[], sportId: SportId, ids: string[]): CartSelection[] {
  return normalizeSelections([
    ...current.filter((selection) => selection.sportId !== sportId),
    ...ids.map((categoryId) => ({ sportId, categoryId })),
  ]);
}

export function toggleCartSelection(current: CartSelection[], selection: CartSelection): CartSelection[] {
  const key = selectionKey(selection);
  return current.some((item) => selectionKey(item) === key)
    ? current.filter((item) => selectionKey(item) !== key)
    : normalizeSelections([...current, selection]);
}

export interface Draft {
  selections: CartSelection[];
  /** Derived legacy fields for existing integrations and old drafts. */
  sport: SportId | null;
  categoryIds: string[];
  date: string | null;
  slot: string | null;
  squadSize: number;
  teamName: string;
  captainName: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
  addons: Record<string, number>;
  coupon: string | null;
  paymentMethod: string | null;
}

export const EMPTY_DRAFT: Draft = {
  selections: [], sport: null, categoryIds: [], date: null, slot: null, squadSize: 1,
  teamName: "", captainName: "", phone: "", email: "", city: "", notes: "",
  addons: {}, coupon: null, paymentMethod: null,
};

export function withSelections(draft: Draft, input: unknown): Draft {
  const selections = normalizeSelections(input);
  const categories = cartCategories(selections);
  const sport = selections[0]?.sportId ?? null;
  return {
    ...draft, selections, sport,
    categoryIds: selections.filter((item) => item.sportId === sport).map((item) => item.categoryId),
    date: categoryDates(categories)[0] ?? null,
    squadSize: Math.max(1, entryTickets(categories)), slot: null, addons: {}, paymentMethod: null,
  };
}

/** Safely migrate session drafts written before the multi-sport cart existed. */
export function restoreDraft(input: unknown): Draft {
  if (!input || typeof input !== "object") return { ...EMPTY_DRAFT };
  const saved = input as Record<string, unknown>;
  const draft = { ...EMPTY_DRAFT };
  for (const key of ["teamName", "captainName", "phone", "email", "city", "notes"] as const) {
    if (typeof saved[key] === "string") draft[key] = saved[key];
  }
  if (typeof saved.coupon === "string") draft.coupon = saved.coupon;
  const legacyIds = Array.isArray(saved.categoryIds) ? saved.categoryIds : [saved.category];
  return withSelections(draft, Array.isArray(saved.selections) ? saved.selections
    : legacyIds.map((categoryId) => ({ sportId: saved.sport, categoryId })));
}