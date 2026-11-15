import { MapPin } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Stamp from '@/components/ui/Stamp';
import StarRating from '@/components/ui/StarRating';
import WhatsAppButton from '@/components/buscar/WhatsAppButton';
import { avatarSrc } from '@/lib/avatarUrl';
import { formatDistance } from '@/lib/format';
import type { ProviderResult } from '@/lib/searchProviders';
import type { Provider } from '@/types/marketplace';

interface ProviderCardProps {
  provider: ProviderResult;
  onOpen: (provider: Provider) => void;
}

export default function ProviderCard({ provider, onOpen }: ProviderCardProps) {
  const cover = provider.portfolioUrls[0];
  const coverSrc = avatarSrc(cover);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift hover:ring-ink/10">
      <div className="relative h-28 bg-petrol">
        {coverSrc && <img src={coverSrc} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" aria-hidden="true" />
        {provider.plan && <Stamp plan={provider.plan} />}
      </div>

      <div className="-mt-10 flex flex-col items-center px-6 pt-1 text-center">
        <div className="relative z-10">
          <Avatar name={provider.name} photoUrl={avatarSrc(provider.photoUrl)} />
        </div>
        <h3 className="mt-3 text-xl leading-tight text-ink">{provider.name}</h3>
        <p className="mt-1 text-sm font-medium text-petrol">{provider.categories.join(' · ')}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-ink/60">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {provider.distanceKm >= 1 ? (
            <>
              {provider.city.name} · {formatDistance(provider.distanceKm)}
            </>
          ) : (
            provider.city.name
          )}
        </p>
        <div className="mt-3">
          <StarRating value={provider.ratingAvg} count={provider.ratingCount} />
        </div>

        {provider.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {provider.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-petrol/10 px-2.5 py-1 text-[11px] font-semibold text-petrol">
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/70">{provider.description}</p>
      </div>

      <div className="mt-auto flex flex-col gap-2 p-6 pt-6">
        <WhatsAppButton providerId={provider.id} whatsapp={provider.whatsapp} />
        <button
          type="button"
          onClick={() => onOpen(provider)}
          className="w-full rounded-full px-4 py-2 text-sm font-medium text-petrol transition hover:bg-petrol/5"
        >
          Ver perfil
        </button>
      </div>
    </article>
  );
}
