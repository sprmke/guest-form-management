export const HIDDEN_CATEGORY_ID = '__hidden__';
export const HIDDEN_CATEGORY_LABEL = 'Hidden';

export function isHiddenCategoryId(categoryId: string): boolean {
  return categoryId === HIDDEN_CATEGORY_ID;
}
