import { supabase } from '@/lib/supabase';
import type { City, Plan } from '@/types/marketplace';

export interface ProviderProfile {
  id: string;
  name: string;
  headline: string;
  description: string;
  whatsapp: string;
  cityId: string;
  photoUrl: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  selectedPlans: Plan[];
}

interface ProfileRow {
  id: string;
  name: string;
  headline: string;
  description: string;
  whatsapp: string;
  city_id: string;
  photo_url: string | null;
  status: ProviderProfile['status'];
  selected_plans: string[] | null;
}

const VALID_PLANS: Plan[] = ['bairro', 'cidade', 'regiao'];

function toProfile(row: ProfileRow): ProviderProfile {
  return {
    id: row.id,
    name: row.name,
    headline: row.headline,
    description: row.description,
    whatsapp: row.whatsapp,
    cityId: row.city_id,
    photoUrl: row.photo_url,
    status: row.status,
    selectedPlans: (row.selected_plans ?? []).filter((plan): plan is Plan =>
      (VALID_PLANS as string[]).includes(plan)
    ),
  };
}

export async function fetchProviderByWhatsapp(whatsappDigits: string): Promise<ProviderProfile | null> {
  const { data, error } = await supabase.rpc('provider_by_whatsapp', {
    p_whatsapp: `55${whatsappDigits}`,
  });
  if (error) throw new Error('Não foi possível buscar seu perfil. Tente novamente.');

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.id !== 'string') return null;
  return toProfile(row as ProfileRow);
}

export interface ProfileUpdateInput {
  providerId: string;
  currentWhatsappDigits: string;
  name: string;
  whatsappDigits: string;
  city: City;
  headline: string;
  description: string;
  /** null = keep current photo; '' = remove photo; a URL = replace it. */
  photoUrl: string | null;
}

export async function updateProviderProfile(input: ProfileUpdateInput): Promise<void> {
  const { error } = await supabase.rpc('update_provider_profile', {
    p_provider_id: input.providerId,
    p_current_whatsapp: `55${input.currentWhatsappDigits}`,
    p_name: input.name,
    p_whatsapp: `55${input.whatsappDigits}`,
    p_city_id: input.city.id,
    p_headline: input.headline,
    p_description: input.description,
    p_photo_url: input.photoUrl,
  });

  if (!error) return;
  const isValidationError = error.code === 'P0001';
  throw new Error(
    isValidationError ? error.message : 'Não foi possível salvar as alterações. Tente novamente.',
  );
}
