import { normalizeText } from '@/lib/text';
import type { City, Plan, Provider } from '@/types/marketplace';

export type SortOption = 'relevancia' | 'proximidade' | 'avaliacoes';

export interface SearchOptions {
  providers: Provider[];
  city: City | null;
  category: string | null;
  query: string;
  sort: SortOption;
}

export interface ProviderResult extends Provider {
  distanceKm: number;
}

const PLAN_WEIGHT: Record<Plan, number> = { regiao: 3, cidade: 2, bairro: 1 };

function planWeight(plan: Plan | null, selectedPlans: Plan[]): number {
  if (selectedPlans.length > 0) {
    return Math.max(...selectedPlans.map((p) => PLAN_WEIGHT[p]));
  }
  return plan ? PLAN_WEIGHT[plan] : 0;
}

const EARTH_RADIUS_KM = 6371;

export function distanceInKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function searchProviders({ providers, city, category, query, sort }: SearchOptions): ProviderResult[] {
  if (!city) return [];

  const normalizedQuery = normalizeText(query);

  const results = providers
    .filter((provider) => provider.city.id === city.id)
    .filter((provider) => !category || provider.categories.includes(category))
    .filter((provider) => {
      if (!normalizedQuery) return true;
      const haystack = normalizeText(
        [provider.name, provider.headline, provider.description, ...provider.categories, ...provider.tags].join(' ')
      );
      return normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .every((word) =>
          haystack
            .split(/[^\p{L}\p{N}]+/u)
            .filter(Boolean)
            .some((token) => token.startsWith(word))
        );
    })
    .map((provider) => ({
      ...provider,
      distanceKm: distanceInKm(city, provider),
    }));

  return results.sort((a, b) => compareBySort(a, b, sort));
}

export function getFeaturedProviders(providers: Provider[], city: City): ProviderResult[] {
  return providers
    .filter((provider) => provider.plan === 'regiao')
    .map((provider) => ({ ...provider, distanceKm: distanceInKm(city, provider) }));
}

function compareBySort(a: ProviderResult, b: ProviderResult, sort: SortOption): number {
  if (sort === 'proximidade') return a.distanceKm - b.distanceKm;
  if (sort === 'avaliacoes') return b.ratingCount - a.ratingCount || b.ratingAvg - a.ratingAvg;

  const planDiff = planWeight(b.plan, b.selectedPlans) - planWeight(a.plan, a.selectedPlans);
  return planDiff || b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
}
