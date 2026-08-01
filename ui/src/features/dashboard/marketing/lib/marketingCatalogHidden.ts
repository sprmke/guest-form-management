export const HIDDEN_CATEGORY_ID = '__hidden__';
export const HIDDEN_CATEGORY_LABEL = 'Archived';
export const ARCHIVE_MENU_LABEL = 'Archive';
export const UNARCHIVE_MENU_LABEL = 'Unarchive';
export const ARCHIVED_EMPTY_MESSAGE = 'Nothing archived.';

export function isHiddenCategoryId(categoryId: string): boolean {
  return categoryId === HIDDEN_CATEGORY_ID;
}
