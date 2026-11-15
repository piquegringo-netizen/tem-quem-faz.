import { supabase } from '@/lib/supabase';

const REVIEWER_KEY_STORAGE = 'tqf_reviewer_key';

function getReviewerKey(): string {
  let key = localStorage.getItem(REVIEWER_KEY_STORAGE);
  if (!key || !/^[0-9a-fA-F-]{36}$/.test(key)) {
    key = crypto.randomUUID();
    localStorage.setItem(REVIEWER_KEY_STORAGE, key);
  }
  return key;
}

export async function submitProviderRating(
  providerId: string,
  rating: number
): Promise<{ ratingAvg: number; ratingCount: number }> {
  const { data, error } = await supabase.rpc('submit_provider_rating', {
    p_provider_id: providerId,
    p_reviewer_key: getReviewerKey(),
    p_rating: rating,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error('Resposta inesperada ao avaliar.');
  return { ratingAvg: Number(result.rating_avg), ratingCount: Number(result.rating_count) };
}
