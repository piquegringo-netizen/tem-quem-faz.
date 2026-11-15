import { useEffect, useState } from 'react';
import RateStars from '@/components/buscar/RateStars';
import { Images, Star, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Stamp from '@/components/ui/Stamp';
import { PlanBadge } from '@/components/ui/StampLegend';
import StarRating from '@/components/ui/StarRating';
import WhatsAppButton from '@/components/buscar/WhatsAppButton';
import { avatarSrc } from '@/lib/avatarUrl';
import { formatRating } from '@/lib/format';
import { PLANS } from '@/lib/plans';
import { fetchStoriesByProvider, fetchWeeklyStats, recordProfileView } from '@/services/marketplace';
import type { Plan, Provider, Story, WeeklyStats } from '@/types/marketplace';

interface ProviderProfileSheetProps {
  provider: Provider | null;
  onClose: () => void;
}

export default function ProviderProfileSheet({ provider, onClose }: ProviderProfileSheetProps) {
  if (!provider) return null;
  return <ProfilePanel key={provider.id} provider={provider} onClose={onClose} />;
}

type StatsState = { status: 'loading' } | { status: 'error' } | ({ status: 'ready' } & WeeklyStats);
type StoriesState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stories: Story[] };

function ProfilePanel({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const [ratings, setRatings] = useState({ ratingAvg: provider.ratingAvg, ratingCount: provider.ratingCount });
  const [stats, setStats] = useState<StatsState>({ status: 'loading' });
  const [storiesState, setStoriesState] = useState<StoriesState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void recordProfileView(provider.id);
    fetchWeeklyStats(provider.id)
      .then((result) => {
        if (!cancelled) setStats({ status: 'ready', ...result });
      })
      .catch(() => {
        if (!cancelled) setStats({ status: 'error' });
      });
    fetchStoriesByProvider(provider.id)
      .then((stories) => {
        if (!cancelled) setStoriesState({ status: 'ready', stories });
      })
      .catch(() => {
        if (!cancelled) setStoriesState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const activeSealPlans = provider.selectedPlans.length > 0 ? provider.selectedPlans : provider.plan ? [provider.plan] : [];
  const recentStories = storiesState.status === 'ready' ? storiesState.stories.slice(0, 6) : [];
  const portfolioUrls = [...new Set(provider.portfolioUrls)];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar perfil"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-ink/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-titulo"
        className="relative max-h-[92vh] w-full max-w-lg animate-sheet overflow-y-auto rounded-t-3xl bg-paper shadow-lift sm:rounded-3xl"
      >
        <div className="relative bg-white px-6 pb-6 pt-8">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-ink/15" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper transition hover:bg-petrol/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="mt-5 flex items-end gap-4">
            <Avatar name={provider.name} size="lg" photoUrl={avatarSrc(provider.photoUrl)} />
            <div className={`min-w-0 flex-1 ${provider.plan ? 'pr-16' : ''}`}>
              <h2 id="perfil-titulo" className="text-3xl leading-tight text-ink">
                {provider.name}
              </h2>
              <p className="mt-1 font-semibold text-petrol">{provider.headline}</p>
              <p className="mt-0.5 font-mono text-sm text-ink/75">
                {provider.city.name} - {provider.city.uf}
              </p>
            </div>
          </div>
          {provider.plan && <Stamp plan={provider.plan} />}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StarRating value={ratings.ratingAvg} count={ratings.ratingCount} />
            {activeSealPlans.map((plan) => (
              <PlanBadge key={plan} plan={plan} />
            ))}
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <dl className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Nota" value={formatRating(ratings.ratingAvg)} icon />
            <Stat
              label="Visitas na semana"
              value={stats.status === 'ready' ? String(stats.views) : stats.status === 'error' ? '-' : '...'}
            />
            <Stat
              label="Contatos na semana"
              value={stats.status === 'ready' ? String(stats.contacts) : stats.status === 'error' ? '-' : '...'}
            />
          </dl>
          {stats.status === 'error' && (
            <p className="-mt-3 text-center text-xs text-rust-dark">Não foi possível carregar as estatísticas agora.</p>
          )}

          <section className="space-y-2">
            <h3 className="text-xl">Sobre o serviço</h3>
            <p className="text-ink/85">{provider.description}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[...provider.categories, ...provider.tags].map((item) => (
                <span key={item} className="rounded-full bg-petrol/10 px-2.5 py-1 text-[11px] font-semibold text-petrol">
                  {item}
                </span>
              ))}
            </div>
          </section>

          {recentStories.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-xl">
                <Images className="h-5 w-5 text-petrol" aria-hidden="true" />
                Stories recentes
              </h3>
              <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
                {recentStories.map((story) => (
                  <div key={story.id} className="relative w-32 shrink-0 snap-start overflow-hidden rounded-2xl shadow-soft">
                    <img
                      src={story.mediaUrl}
                      alt={story.caption ?? `Story de ${provider.name}`}
                      loading="lazy"
                      className="aspect-[9/14] w-full object-cover"
                    />
                    {story.caption && (
                      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent px-2 py-3 text-[11px] font-medium text-white">
                        {story.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {portfolioUrls.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xl">Trabalhos realizados</h3>
              <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
                {portfolioUrls.map((url) => (
                  <img
                    key={url}
                    src={avatarSrc(url)}
                    alt={`Trabalho de ${provider.name}`}
                    loading="lazy"
                    className="aspect-[4/3] w-64 shrink-0 snap-start rounded-2xl object-cover shadow-soft"
                  />
                ))}
              </div>
            </section>
          )}

          {activeSealPlans.length > 0 && (
            <section className="space-y-2 rounded-2xl bg-white px-4 py-4 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/70">Selos ativos</h3>
              <ul className="space-y-2">
                {activeSealPlans.map((plan: Plan) => (
                  <li key={plan} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{PLANS[plan].name}</span>
                    <span className="text-ink/70">{PLANS[plan].description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
            <Star className="h-6 w-6 fill-mustard text-mustard-dark" aria-hidden="true" />
            <p className="text-sm">
              <span className="font-mono text-base font-medium">{formatRating(ratings.ratingAvg)} de 5</span>{' '}
              com {ratings.ratingCount} avaliações de clientes
            </p>
          </section>

          <RateStars
            providerId={provider.id}
            ratingAvg={ratings.ratingAvg}
            ratingCount={ratings.ratingCount}
            onRated={(ratingAvg, ratingCount) => setRatings({ ratingAvg, ratingCount })}
          />

          <WhatsAppButton providerId={provider.id} whatsapp={provider.whatsapp} size="large" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="flex flex-col-reverse rounded-2xl bg-white px-2 py-3 shadow-soft">
      <dt className="mt-1 text-[11px] font-semibold uppercase leading-tight tracking-wide text-ink/70">{label}</dt>
      <dd className="flex items-center justify-center gap-1 font-mono text-2xl font-medium text-ink">
        {icon && <Star className="h-4 w-4 fill-mustard text-mustard-dark" aria-hidden="true" />}
        {value}
      </dd>
    </div>
  );
}
