import { Check } from 'lucide-react';
import { PLANS, PLAN_LIST, formatPrice } from '@/lib/plans';
import type { Plan } from '@/types/marketplace';

const PLAN_COLOR: Record<Plan, string> = {
  bairro: 'border-petrol text-petrol',
  cidade: 'border-mustard-dark text-mustard-dark',
  regiao: 'border-rust text-rust',
};

interface StampLegendProps {
  compact?: boolean;
}

export default function StampLegend({ compact = false }: StampLegendProps) {
  return (
    <section className={`rounded-3xl bg-white ${compact ? 'p-5' : 'p-6 sm:p-8'} shadow-card`}>
      <header className="space-y-1">
        <h2 className="text-2xl text-ink">Selos de destaque</h2>
        <p className="text-sm text-ink/70">
          Quanto maior o selo, mais gente vê seu perfil. Você pode combinar mais de um.
        </p>
      </header>

      <ul className="mt-5 space-y-4">
        {PLAN_LIST.map((plan) => (
          <li
            key={plan.id}
            className={`flex gap-4 rounded-2xl border-2 ${PLAN_COLOR[plan.id]} bg-paper/40 p-4`}
          >
            <div
              className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-[3px] ${PLAN_COLOR[plan.id]} bg-paper/80`}
            >
              <span className="font-display text-xs leading-none tracking-wider">ATIVO</span>
              <span className="mt-0.5 font-mono text-[9px] font-medium uppercase leading-none">
                {plan.name.replace('Selo ', '')}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                <span className="font-mono text-lg font-bold text-ink">{formatPrice(plan.price)}/mês</span>
              </div>
              <p className="text-sm text-ink/70">{plan.description}</p>
              <ul className="flex flex-col gap-1 pt-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5 text-xs text-ink/80">
                    <Check className="h-3.5 w-3.5 shrink-0 text-whatsapp" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  const info = PLANS[plan];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${PLAN_COLOR[plan]} bg-paper/60 px-2.5 py-1 text-[11px] font-semibold`}
    >
      {info.name}
    </span>
  );
}
