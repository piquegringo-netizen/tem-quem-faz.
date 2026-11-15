import { supabase } from '@/lib/supabase';
import type { Plan } from '@/types/marketplace';

export interface RegistrationInput {
  name: string;
  whatsappDigits: string;
  cityId: string;
  categoryId: string;
  headline: string;
  description: string;
  selectedPlans: Plan[];
  registrationFeePaid: boolean;
}

export async function submitProviderRegistration(input: RegistrationInput): Promise<string> {
  const { data, error } = await supabase.rpc('submit_provider', {
    p_name: input.name,
    p_whatsapp: `55${input.whatsappDigits}`,
    p_city_id: input.cityId,
    p_category_id: input.categoryId,
    p_headline: input.headline,
    p_description: input.description,
    p_selected_plans: input.selectedPlans.length > 0 ? input.selectedPlans : null,
    p_registration_fee_paid: input.registrationFeePaid,
  });

  if (!error && data) return typeof data === 'string' ? data : String(data);
  const isValidationError = error?.code === 'P0001';
  throw new Error(
    isValidationError ? error.message : 'Não foi possível enviar seu cadastro. Tente novamente.',
  );
}
