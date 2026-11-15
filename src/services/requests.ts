import { supabase } from '@/lib/supabase';
import type { PreparedAvatar } from '@/lib/avatarImage';
import type { RequestCategory, ServiceRequest } from '@/types/requests';
import type { City } from '@/types/marketplace';

interface RequestRow {
  id: string;
  name: string;
  whatsapp: string;
  description: string;
  category: RequestCategory;
  photo_url: string | null;
  status: ServiceRequest['status'];
  created_at: string;
  city: {
    id: string;
    slug: string;
    name: string;
    uf: string;
    latitude: number;
    longitude: number;
  } | null;
}

const REQUEST_COLUMNS = `id, name, whatsapp, description, category, photo_url, status, created_at,
  city:cities(id, slug, name, uf, latitude, longitude)`;

function toRequest(row: RequestRow): ServiceRequest | null {
  if (!row.city) return null;
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    description: row.description,
    category: row.category,
    photoUrl: row.photo_url,
    status: row.status,
    createdAt: row.created_at,
    city: {
      id: row.city.id,
      slug: row.city.slug,
      name: row.city.name,
      uf: row.city.uf.trim(),
      latitude: Number(row.city.latitude),
      longitude: Number(row.city.longitude),
    },
  };
}

export async function fetchOpenRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('requests')
    .select(REQUEST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error('Não foi possível carregar os pedidos.');
  return ((data ?? []) as unknown as RequestRow[]).flatMap((row) => {
    const request = toRequest(row);
    return request ? [request] : [];
  });
}

export interface NewRequestInput {
  name: string;
  whatsappDigits: string;
  description: string;
  category: RequestCategory;
  city: City;
  photoPath?: string | null;
}

export async function publishRequest(input: NewRequestInput): Promise<void> {
  const { error } = await supabase.from('requests').insert({
    name: input.name.trim(),
    whatsapp: `55${input.whatsappDigits}`,
    description: input.description.trim(),
    category: input.category,
    city_id: input.city.id,
    photo_url: input.photoPath ? `/object/public/avatars/${input.photoPath}` : null,
  });
  if (error) {
    throw new Error('Não foi possível publicar seu pedido. Verifique os dados e tente novamente.');
  }
}

export async function resolveRequest(requestId: string, whatsappDigits: string): Promise<void> {
  const { error } = await supabase.rpc('resolve_request', {
    p_request_id: requestId,
    p_whatsapp: `55${whatsappDigits}`,
  });
  if (error) throw new Error(error.message);
}

export async function deleteRequest(requestId: string, whatsappDigits: string): Promise<void> {
  const { error } = await supabase.rpc('delete_request', {
    p_request_id: requestId,
    p_whatsapp: `55${whatsappDigits}`,
  });
  if (error) throw new Error(error.message);
}

/** Optional photo for a request; resized in the browser, stored in avatars bucket. */
export async function uploadRequestPhoto(photo: PreparedAvatar): Promise<string> {
  const { blob, path } = photo;
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.');
  return path;
}

export async function removeRequestPhoto(path: string): Promise<void> {
  await supabase.storage.from('avatars').remove([path]);
}
export function buildRequestWhatsAppUrl(request: Pick<ServiceRequest, 'whatsapp' | 'name'>): string {
  const message = `Olá ${request.name.split(' ')[0]}! Vi seu pedido no Tem Quem Faz e posso ajudar.`;
  return `https://wa.me/${request.whatsapp}?text=${encodeURIComponent(message)}`;
}
