import type { SortOption } from '@/lib/searchProviders';

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'proximidade', label: 'Mais perto' },
  { value: 'avaliacoes', label: 'Mais avaliados' },
];

interface SortControlProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export default function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Ordenar resultados">
      <span className="shrink-0 text-xs font-medium text-ink/60">Ordenar</span>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
              active ? 'bg-ink text-paper' : 'text-ink/65 hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
