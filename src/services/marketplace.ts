import { supabase } from '@/lib/supabase';
import type { Category, City, Plan, Provider, ProviderStatus, Story, StoryWithProvider, WeeklyStats } from '@/types/marketplace';

interface CityRow {
  id: string;
  slug: string;
  name: string;
  uf: string;
  latitude: number;
  longitude: number;
}

interface ProviderRow {
  id: string;
  name: string;
  headline: string;
  description: string;
  whatsapp: string;
  plan: Plan | null;
  selected_plans: Plan[] | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  rating_avg: number | string;
  rating_count: number;
  tags: string[] | null;
  portfolio_urls: string[] | null;
  portfolio_photos: { path: string }[] | null;
  city: CityRow | null;
  provider_categories: { categories: { name: string } | null }[] | null;
}

const CITY_COLUMNS = 'id, slug, name, uf, latitude, longitude';
const PROVIDER_COLUMNS = `id, name, headline, description, whatsapp, plan, selected_plans, photo_url, latitude, longitude,
  rating_avg, rating_count, tags, portfolio_urls,
  portfolio_photos(path),
  city:cities!inner(${CITY_COLUMNS}),
  provider_categories(categories(name))`;

function toCity(row: CityRow): City {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    uf: row.uf.trim(),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}

function toProvider(row: ProviderRow): Provider | null {
  if (!row.city) return null;

  return {
    id: row.id,
    name: row.name,
    headline: row.headline,
    description: row.description,
    whatsapp: row.whatsapp,
    plan: row.plan,
    selectedPlans: row.selected_plans ?? [],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    tags: row.tags ?? [],
    portfolioUrls: [
      ...(row.portfolio_photos ?? []).map((item) => item.path),
      ...(row.portfolio_urls ?? []),
    ],
    photoUrl: row.photo_url,
    city: toCity(row.city),
    categories: (row.provider_categories ?? []).flatMap((link) =>
      link.categories ? [link.categories.name] : []
    ),
  };
}

export async function fetchActiveCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select(CITY_COLUMNS)
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error('Não foi possível carregar as cidades.');
  return ((data ?? []) as CityRow[]).map(toCity);
}

export async function fetchProvidersByStatus(status: ProviderStatus): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select(PROVIDER_COLUMNS)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar os prestadores.');
  return ((data ?? []) as unknown as ProviderRow[]).flatMap((row) => {
    const provider = toProvider(row);
    return provider ? [provider] : [];
  });
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('sort_order');
  if (error) throw new Error('Não foi possível carregar as categorias.');
  return (data ?? []) as Category[];
}

export async function recordProfileView(providerId: string): Promise<void> {
  const { error } = await supabase.from('profile_views').insert({ provider_id: providerId });
  if (error) console.warn('Não foi possível registrar a visualização.', error.message);
}

export async function recordContactClick(providerId: string): Promise<void> {
  const { error } = await supabase.from('contact_clicks').insert({ provider_id: providerId });
  if (error) console.warn('Não foi possível registrar o contato.', error.message);
}

export async function fetchWeeklyStats(providerId: string): Promise<WeeklyStats> {
  const { data, error } = await supabase.rpc('provider_weekly_stats', { p_provider_id: providerId });
  if (error) throw new Error('Não foi possível carregar as estatísticas.');

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.views === 'undefined' || typeof row.contacts === 'undefined') {
    throw new Error('Resposta inesperada ao carregar as estatísticas.');
  }
  return { views: Number(row.views), contacts: Number(row.contacts) };
}

interface StoryRow {
  id: string;
  provider_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  provider: { name: string; headline: string } | null;
}

function toStory(row: StoryRow): StoryWithProvider | null {
  if (!row.provider) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    caption: row.caption,
    createdAt: row.created_at,
    providerName: row.provider.name,
    providerHeadline: row.provider.headline,
  };
}

export async function fetchActiveStories(): Promise<StoryWithProvider[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(`id, provider_id, media_url, media_type, caption, created_at,
      provider:providers!inner(name, headline)`)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar os stories.');
  return ((data ?? []) as unknown as StoryRow[]).flatMap((row) => {
    const story = toStory(row);
    return story ? [story] : [];
  });
}

export async function fetchStoriesByProvider(providerId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, provider_id, media_url, media_type, caption, created_at')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar os stories.');
  return ((data ?? []) as unknown as Omit<StoryRow, 'provider'>[]).map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    caption: row.caption,
    createdAt: row.created_at,
  }));
}
