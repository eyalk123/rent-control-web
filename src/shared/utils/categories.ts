import type { TFunction } from 'i18next';

export function translateCategory(key: string | null | undefined, t: TFunction): string {
  if (!key) return '—';
  return t(`expenseCategories.${key}` as never, key);
}
