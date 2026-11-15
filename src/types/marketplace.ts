export type Plan = 'bairro' | 'cidade' | 'regiao';

export interface City {
  id: string;
  slug: string;
  name: string;
  uf: string;
  latitude: number;
  longitude: number;
}

export interface Provider {
  id: string;
  name: string;
  headline: string;
  description: string;
  whatsapp: string;
  plan: Plan | null;
  selectedPlans: Plan[];
  latitude: number;
  longitude: number;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  portfolioUrls: string[];
  photoUrl: string | null;
  city: City;
  categories: string[];
}

export interface Story {
  id: string;
  providerId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string | null;
  createdAt: string;
}

export interface StoryWithProvider extends Story {
  providerName: string;
  providerHeadline: string;
}

export type ProviderStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface Category {
  id: string;
  name: string;
}

export interface WeeklyStats {
  views: number;
  contacts: number;
}
