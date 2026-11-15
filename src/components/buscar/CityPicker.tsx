import { ChevronDown, MapPin } from 'lucide-react';
import type { City } from '@/types/marketplace';

interface CityPickerProps {
  cities: City[];
  selectedCityId: string;
  onChange: (cityId: string) => void;
}

export default function CityPicker({ cities, selectedCityId, onChange }: CityPickerProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-ink/60">Cidade</span>
      <span className="relative block">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-petrol" aria-hidden="true" />
        <select
          value={selectedCityId}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-2xl border border-ink/10 bg-white py-3.5 pl-11 pr-10 text-base font-medium text-ink shadow-soft transition focus:border-petrol focus:outline-none focus-visible:ring-4 focus-visible:ring-petrol/15"
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} - {city.uf}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/60" aria-hidden="true" />
      </span>
    </label>
  );
}
