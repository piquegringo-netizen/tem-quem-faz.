import { supabase } from '@/lib/supabase';
import type { PreparedAvatar } from '@/lib/avatarImage';

/**
 * Uploads an avatar photo and returns its public URL (path form, e.g.
 * `/object/public/avatars/<uuid>.jpg`), matching what the RPCs validate.
 */
export async function uploadAvatar(providerId: string, photo: PreparedAvatar): Promise<string> {
  const { blob, path } = photo;
  const storagePath = `${providerId}/${path}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.');

  const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
  const url = data.publicUrl;
  const marker = '/object/public/avatars/';
  const index = url.indexOf(marker);
  if (index === -1) throw new Error('Não foi possível gerar o link da foto.');
  return url.slice(index);
}
