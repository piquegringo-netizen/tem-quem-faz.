import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, MapPin, Phone, Tags, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { PlanBadge } from '@/components/ui/StampLegend';
import { formatWhatsAppDisplay } from '@/lib/phone';
import { avatarSrc } from '@/lib/avatarUrl';
import { updateProviderStatus } from '@/services/admin';
import { fetchProvidersByStatus } from '@/services/marketplace';
import type { Provider, ProviderStatus } from '@/types/marketplace';

interface PendingProviderListProps {
  onApprovalChange: () => void;
}

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; providers: Provider[] };

export default function PendingProviderList({ onApprovalChange }: PendingProviderListProps) {
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProvidersByStatus('pendente')
      .then((providers) => active && setList({ status: 'ready', providers }))
      .catch(() => active && setList({ status: 'error' }));
    return () => {
      active = false;
    };
  }, []);

  async function decide(provider: Provider, status: ProviderStatus) {
    setBusyId(provider.id);
    setActionError(null);
    try {
      await updateProviderStatus(provider.id, status);
      setList((prev) =>
        prev.status === 'ready'
          ? { status: 'ready', providers: prev.providers.filter((item) => item.id !== provider.id) }
          : prev,
      );
      if (status === 'aprovado') onApprovalChange();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível atualizar o cadastro.');
    } finally {
      setBusyId(null);
    }
  }

  if (list.status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-ink/80">
        <Loader2 className="h-8 w-8 animate-spin text-petrol" aria-hidden="true" />
        <p>Carregando cadastros...</p>
      </div>
    );
  }

  if (list.status === 'error') {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-card">
        <AlertTriangle className="h-10 w-10 text-rust" aria-hidden="true" />
        <p className="mt-4 font-semibold text-ink">Não foi possível carregar os cadastros.</p>
        <p className="mt-1 text-sm text-ink/70">Atualize a página para tentar de novo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
          {actionError}
        </p>
      )}

      {list.providers.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-card">
          <p className="font-display text-2xl uppercase text-ink">Tudo em dia</p>
          <p className="mt-2 text-ink/70">Nenhum cadastro aguardando aprovação.</p>
        </div>
      ) : (
        <>
          <p className="font-mono text-sm text-ink/60">
            {list.providers.length} {list.providers.length === 1 ? 'cadastro aguardando' : 'cadastros aguardando'}
          </p>
          <ul className="space-y-4">
            {list.providers.map((provider) => (
              <li key={provider.id} className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
                <div className="flex gap-4">
                  <Avatar name={provider.name} photoUrl={avatarSrc(provider.photoUrl)} />
                  <div className="min-w-0 space-y-2">
                    <h2 className="truncate text-2xl text-ink">{provider.name}</h2>
                    <p className="text-sm text-ink/70">{provider.headline}</p>
                    <ul className="space-y-1 text-sm text-ink/80">
                      <li className="flex items-center gap-2">
                        <Tags className="h-4 w-4 shrink-0 text-petrol" aria-hidden="true" />
                        {provider.categories.join(' · ') || 'Sem categoria'}
                      </li>
                      <li className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-petrol" aria-hidden="true" />
                        {provider.city.name} - {provider.city.uf}
                      </li>
                      <li className="flex items-center gap-2 font-mono">
                        <Phone className="h-4 w-4 shrink-0 text-petrol" aria-hidden="true" />
                        {formatWhatsAppDisplay(provider.whatsapp)}
                      </li>
                      {provider.selectedPlans.length > 0 && (
                        <li className="flex flex-wrap items-center gap-1.5 pt-1">
                          {provider.selectedPlans.map((plan) => (
                            <PlanBadge key={plan} plan={plan} />
                          ))}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => decide(provider, 'rejeitado')}
                    disabled={busyId === provider.id}
                    className="flex items-center justify-center gap-2 rounded-xl border border-rust/40 bg-white px-4 py-3 font-semibold text-rust-dark transition hover:bg-rust/5 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(provider, 'aprovado')}
                    disabled={busyId === provider.id}
                    className="flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-whatsapp-dark disabled:opacity-60"
                  >
                    {busyId === provider.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    )}
                    Aprovar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
