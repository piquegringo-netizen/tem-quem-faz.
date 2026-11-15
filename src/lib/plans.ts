import type { Plan } from '@/types/marketplace';

export interface PlanInfo {
  id: Plan;
  name: string;
  price: number;
  description: string;
  features: string[];
}

export const REGISTRATION_FEE = 49.9;

export const PLANS: Record<Plan, PlanInfo> = {
  bairro: {
    id: 'bairro',
    name: 'Selo Bairro',
    price: 29.9,
    description: 'Aparece para quem procura na sua região.',
    features: ['Destaque no seu bairro', 'Selo ativo no perfil', 'Botão direto para WhatsApp'],
  },
  cidade: {
    id: 'cidade',
    name: 'Selo Cidade',
    price: 59.9,
    description: 'Top 3 da sua categoria na cidade.',
    features: ['Tudo do Selo Bairro', 'Top 3 da categoria na cidade', 'Maior destaque na busca'],
  },
  regiao: {
    id: 'regiao',
    name: 'Selo Região',
    price: 99.9,
    description: 'Destaque máximo + cidades vizinhas.',
    features: ['Tudo do Selo Cidade', 'Destaque em cidades vizinhas', 'Carrossel "Em destaque na região"'],
  },
};

export const PLAN_LIST: PlanInfo[] = [PLANS.bairro, PLANS.cidade, PLANS.regiao];

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function selectedPlansTotal(plans: Plan[]): number {
  return plans.reduce((total, plan) => total + PLANS[plan].price, 0);
}
