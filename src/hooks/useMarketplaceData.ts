import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveCities,
  fetchActiveStories,
  fetchCategories,
  fetchProvidersByStatus,
} from '@/services/marketplace';
import type { Category, City, Provider, StoryWithProvider } from '@/types/marketplace';

type MarketplaceState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      cities: City[];
      categories: Category[];
      providers: Provider[];
      stories: StoryWithProvider[];
    };

export function useMarketplaceData() {
  const [state, setState] = useState<MarketplaceState>({ status: 'loading' });

  const load = useCallback(() => {
    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
    Promise.all([
      fetchActiveCities(),
      fetchCategories(),
      fetchProvidersByStatus('aprovado'),
      fetchActiveStories(),
    ])
      .then(([cities, categories, providers, stories]) =>
        setState({ status: 'ready', cities, categories, providers, stories }),
      )
      .catch((error: Error) => setState({ status: 'error', message: error.message }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}
