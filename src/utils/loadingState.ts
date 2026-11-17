export interface AsyncCollectionLoadState {
  supabaseSettled: boolean;
  restSettled: boolean;
}

export const INITIAL_COLLECTION_LOAD_STATE: AsyncCollectionLoadState = {
  supabaseSettled: false,
  restSettled: false,
};

/**
 * Determines whether a collection fetched concurrently from Supabase Realtime
 * and REST fallback is still loading.
 *
 * Loading completes immediately once at least one item is available, or once
 * both primary (Supabase) and fallback (REST) sources have settled.
 */
export function isCollectionLoading(
  state: AsyncCollectionLoadState,
  itemCount: number
): boolean {
  if (itemCount > 0) {
    return false;
  }
  return !(state.supabaseSettled && state.restSettled);
}

/**
 * Computes responsive skeleton placeholder count by container layout.
 */
export function getSkeletonCountForLayout(
  layout: 'row' | 'grid' | 'categories' | 'premium'
): number {
  switch (layout) {
    case 'categories':
      return 5;
    case 'grid':
      return 10;
    case 'premium':
    case 'row':
    default:
      return 5;
  }
}
