import type { Plan } from '@/types/marketplace';

const PLAN_STYLE: Record<Plan, { tier: string; color: string }> = {
  bairro: { tier: 'Bairro', color: 'border-petrol text-petrol' },
  cidade: { tier: 'Cidade', color: 'border-mustard-dark text-mustard-dark' },
  regiao: { tier: 'Região', color: 'border-rust text-rust' },
};

interface StampProps {
  plan: Plan;
}

export default function Stamp({ plan }: StampProps) {
  const style = PLAN_STYLE[plan];

  return (
    <div
      aria-label={`Selo ${style.tier}: ativo`}
      className={`pointer-events-none absolute right-3 top-7 flex h-20 w-20 animate-stamp flex-col items-center justify-center rounded-full border-[3px] bg-paper/80 ${style.color}`}
    >
      <span className="font-display text-lg leading-none tracking-wider">ATIVO</span>
      <span className="mt-1 font-mono text-[10px] font-medium uppercase leading-none">{style.tier}</span>
    </div>
  );
}
