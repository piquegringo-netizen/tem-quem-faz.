import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Tag } from 'lucide-react';
import { PLANS, formatPrice } from '@/lib/plans';
import { supabase } from '@/lib/supabase';
import { fetchProvidersByStatus } from '@/services/marketplace';
import type { Plan, Provider } from '@/types/marketplace';

interface ProviderSealsManagerProps {
  onPlansChanged: () => void;
}

const PLAN_IDS: Plan[] = ['bairro', 'cidade', 'regiao'];

export default function ProviderSealsManager({ onPlansChanged }: ProviderSealsManagerProps) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetchProvidersByStatus('aprovado')
      .then((list) => {
        if (!active) return;
        setProviders(list);
        setSelectedId((current) => current || list[0]?.id || '');
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(
    () => providers?.find((provider) => provider.id === selectedId) ?? null,
    [providers, selectedId]
  );

  useEffect(() => {
    if (selected) {
      setPlans(selected.selectedPlans);
      setSaved(false);
      setError(null);
    }
  }, [selected]);

  const unchanged =
    !!selected && plans.length === selected.selectedPlans.length && plans.every((plan) => selected.selectedPlans.includes(plan));

  function toggle(plan: Plan) {
    setSaved(false);
    setPlans((prev) => (prev.includes(plan) ? prev.filter((item) => item !== plan) : [...prev, plan]));
  }

  async function handleSave() {
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('update_provider_plans', {
        p_provider_id: selected.id,
        p_whatsapp: selected.whatsapp,
        p_selected_plans: plans,
      });
      if (rpcError) throw rpcError;
      setProviders((prev) =>
        (prev ?? []).map((provider) =>
          provider.id === selected.id ? { ...provider, selectedPlans: plans } : provider
        )
      );
      onPlansChanged();
      setSaved(true);
    } catch {
      setError('Não foi possível salvar os selos. Confira se você está logado como admin e tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="text-sm font-medium text-rust-dark">Não foi possível carregar os prestadores.</p>;
  }

  if (providers === null) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-ink/70">
        <Loader2 className="h-4 w-4 animate-spin text-petrol" aria-hidden="true" />
        Carregando prestadores...
      </div>
    );
  }

  if (providers.length === 0) {
    return <p className="text-sm text-ink/70">Nenhum prestador aprovado ainda.</p>;
  }

  return (
    <section className="space-y-4 rounded-3xl bg-white p-6 shadow-card sm:p-8">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 text-2xl text-ink">
          <Tag className="h-5 w-5 text-petrol" aria-hidden="true" />
          Selos dos prestadores
        </h3>
        <p className="text-sm text-ink/70">
          Escolha um prestador e marque os selos que ele pagou. O destaque aparece na busca na hora.
        </p>
      </header>

      <label className="block space-y-2">
        <span className="block text-sm font-semibold text-ink/80">Prestador</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-paper/60 px-4 py-3 text-ink transition focus:border-petrol focus:bg-white focus:outline-none focus:ring-4 focus:ring-petrol/15"
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} — {provider.city.name} ({provider.whatsapp.replace(/^55/, '')})
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <>
          <div className="space-y-3">
            {PLAN_IDS.map((plan) => {
              const checked = plans.includes(plan);
              const info = PLANS[plan];
              return (
                <button
                  key={plan}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-pressed={checked}
                  onClick={() => toggle(plan)}
                  disabled={saving}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition disabled:opacity-60 ${
                    checked ? 'border-petrol bg-petrol/5 shadow-soft' : 'border-ink/15 bg-paper/40 hover:border-ink/30'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-ink">{info.name}</p>
                    <p className="text-xs text-ink/60">{info.description}</p>
                  </div>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                      checked ? 'border-petrol bg-petrol text-white' : 'border-ink/25 bg-white text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="rounded-xl bg-whatsapp/10 px-4 py-3 text-sm font-medium text-petrol">
              Selos atualizados! Já aparecem na busca.
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || unchanged}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-petrol px-5 py-3 font-semibold text-white shadow-soft transition hover:bg-petrol-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
            {saving ? 'Salvando...' : unchanged ? 'Selos já salvos' : `Salvar selos (${formatPrice(plans.reduce((total, plan) => total + PLANS[plan].price, 0))}/mês)`}
          </button>
        </>
      )}
    </section>
  );
}
