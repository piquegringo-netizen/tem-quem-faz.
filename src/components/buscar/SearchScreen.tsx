import { useMemo, useState } from 'react';
import { Info, SearchX, X } from 'lucide-react';
import CityPicker from '@/components/buscar/CityPicker';
import SearchField from '@/components/buscar/SearchField';
import FeaturedCarousel from '@/components/buscar/FeaturedCarousel';
import CategoryChips from '@/components/buscar/CategoryChips';
import SortControl from '@/components/buscar/SortControl';
import ProviderCard from '@/components/buscar/ProviderCard';
import ProviderProfileSheet from '@/components/buscar/ProviderProfileSheet';
import StoriesRow from '@/components/buscar/StoriesRow';
import StoryViewer from '@/components/buscar/StoryViewer';
import StampLegend from '@/components/ui/StampLegend';
import { getFeaturedProviders, searchProviders, type SortOption } from '@/lib/searchProviders';
import type { City, Provider, StoryWithProvider } from '@/types/marketplace';

const LAUNCH_CITY_SLUG = 'pote-mg';

interface SearchScreenProps {
  cities: City[];
  providers: Provider[];
  stories: StoryWithProvider[];
}

export default function SearchScreen({ cities, providers, stories }: SearchScreenProps) {
  const [cityId, setCityId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('relevancia');
  const [openProvider, setOpenProvider] = useState<Provider | null>(null);
  const [showSealInfo, setShowSealInfo] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);

  const city =
    cities.find((item) => item.id === cityId) ??
    cities.find((item) => item.slug === LAUNCH_CITY_SLUG) ??
    cities[0] ??
    null;

  const results = useMemo(
    () => searchProviders({ providers, city, category, query, sort }),
    [providers, city, category, query, sort]
  );

  const featured = useMemo(
    () => (city ? getFeaturedProviders(providers, city) : []),
    [providers, city]
  );

  const categories = useMemo(() => {
    const names = providers
      .filter((provider) => provider.city.id === city?.id)
      .flatMap((provider) => provider.categories);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [providers, city]);

  const storiesByProvider = useMemo(() => {
    const seen = new Set<string>();
    return stories.filter((story) => {
      if (seen.has(story.providerId)) return false;
      seen.add(story.providerId);
      return true;
    });
  }, [stories]);

  if (!city) {
    return (
      <p className="mt-16 text-center text-ink/75">Ainda não há cidades disponíveis.</p>
    );
  }

  const handleCityChange = (nextCityId: string) => {
    setCityId(nextCityId);
    setCategory(null);
  };

  return (
    <div className="space-y-12">
      <StoriesRow stories={storiesByProvider} onOpen={setStoryViewerIndex} />

      <section className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end">
          <CityPicker cities={cities} selectedCityId={city.id} onChange={handleCityChange} />
          <SearchField value={query} onChange={setQuery} />
        </div>
      </section>

      {featured.length > 0 && <FeaturedCarousel providers={featured} onOpen={setOpenProvider} />}

      <section className="space-y-5">
        <CategoryChips categories={categories} active={category} onChange={setCategory} />

        <SortControl value={sort} onChange={setSort} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl text-ink">Prestadores em {city.name}</h2>
          {results.length > 0 && (
            <span className="font-mono text-sm text-ink/75">
              {results.length} {results.length === 1 ? 'encontrado' : 'encontrados'}
            </span>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} onOpen={setOpenProvider} />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-ink/40 bg-white/60 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-ink">
              <SearchX className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xl text-ink">Nenhum prestador encontrado nesta cidade ainda.</p>
            <p className="mt-1 text-sm text-ink/75">Seja o primeiro a anunciar!</p>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-ink/40 bg-white/60 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-ink">
              <SearchX className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xl text-ink">Nenhum prestador encontrado para essa busca.</p>
            <p className="mt-1 text-sm text-ink/75">
              Tente outro termo, troque a categoria ou escolha uma cidade diferente.
            </p>
          </div>
        )}
      </section>

      <ProviderProfileSheet provider={openProvider} onClose={() => setOpenProvider(null)} />

      {storyViewerIndex !== null && (
        <StoryViewer
          stories={storiesByProvider}
          startIndex={storyViewerIndex}
          onClose={() => setStoryViewerIndex(null)}
        />
      )}

      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setShowSealInfo((prev) => !prev)}
          aria-expanded={showSealInfo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white px-4 py-3 font-semibold text-ink transition hover:border-petrol hover:text-petrol"
        >
          <Info className="h-5 w-5" aria-hidden="true" />
          {showSealInfo ? 'Ocultar selos' : 'O que são os selos?'}
        </button>
        {showSealInfo && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSealInfo(false)}
              aria-label="Fechar"
              className="absolute -top-2 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white shadow-soft"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <StampLegend />
          </div>
        )}
      </section>
    </div>
  );
}
