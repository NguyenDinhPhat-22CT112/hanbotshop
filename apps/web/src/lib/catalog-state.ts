export type CatalogViewState = 'unavailable' | 'empty' | 'ready';

export function getCatalogViewState(unavailable: boolean, productCount: number): CatalogViewState {
  if (unavailable) return 'unavailable';
  return productCount > 0 ? 'ready' : 'empty';
}
