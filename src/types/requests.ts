export type RequestCategory = 'pedreiro' | 'eletricista' | 'encanador' | 'diarista' | 'pintor' | 'outro';

export type RequestStatus = 'aberto' | 'resolvido';

export interface ServiceRequest {
  id: string;
  name: string;
  whatsapp: string;
  description: string;
  category: RequestCategory;
  photoUrl: string | null;
  status: RequestStatus;
  createdAt: string;
  city: City;
}

import type { City } from '@/types/marketplace';
