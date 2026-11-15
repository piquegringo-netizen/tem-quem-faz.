import { supabase } from '@/lib/supabase';
import type { PreparedAvatar } from '@/lib/avatarImage';

export interface PortfolioPhoto {
  id: string;
  path: string;
  createdAt: string;
}

interface PortfolioRow {
  id: string;
  path: string;
  created_at: string;
}

export const PORTFOLIO_MAX_PHOTOS = 6;

export async function fetchPortfolio(providerId: string): Promise<PortfolioPhoto[]> {
  const { data, error } = await supabase
    .from('portfolio_photos')
    .select('id, path, created_at')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar as fotos de trabalhos.');
  return ((data ?? []) as PortfolioRow[]).map((row) => ({
    id: row.id,
    path: row.path,
    createdAt: row.created_at,
  }));
}

export async function addPortfolioPhoto(providerId: string, whatsappDigits: string, photo: PreparedAvatar): Promise<PortfolioPhoto> {
  const storagePath = `${providerId}/${photo.path}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, photo.blob, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw new Error('Não foi possível enviar a foto. Tente novamente.');

  const { data, error } = await supabase.rpc('add_portfolio_photo', {
    p_provider_id: providerId,
    p_whatsapp: `55${whatsappDigits}`,
    p_path: storagePath,
  });
  if (error) {
    await supabase.storage.from('avatars').remove([storagePath]);
    throw new Error(error.message);
  }
  const photoId = Array.isArray(data) ? data[0] : data;
  return {
    id: typeof photoId === 'string' ? photoId : crypto.randomUUID(),
    path: storagePath,
    createdAt: new Date().toISOString(),
  };
}

export async function removePortfolioPhoto(photoId: string, whatsappDigits: string): Promise<void> {
  const { error } = await supabase.rpc('remove_portfolio_photo', {
    p_photo_id: photoId,
    p_whatsapp: `55${whatsappDigits}`,
  });
  if (error) throw new Error(error.message);
}
