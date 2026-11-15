import ProviderCard from '@/components/buscar/ProviderCard';
import type { ProviderResult } from '@/lib/searchProviders';
import type { Provider } from '@/types/marketplace';

interface FeaturedCarouselProps {
  providers: ProviderResult[];
  onOpen: (provider: Provider) => void;
}

export default function FeaturedCarousel({ providers, onOpen }: FeaturedCarouselProps) {
  return (
    <section aria-labelledby="destaque-regiao" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="destaque-regiao" className="text-2xl text-ink">
          Em destaque na região
        </h2>
        <span className="rounded-md bg-rust px-2 py-1 font-mono text-xs font-medium uppercase text-paper">
          Selo Região
        </span>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-1 sm:mx-0 sm:px-0">
        {providers.map((provider) => (
          <div key={provider.id} className="w-[17.5rem] shrink-0 snap-start sm:w-80">
            <ProviderCard provider={provider} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </section>
  );
}
