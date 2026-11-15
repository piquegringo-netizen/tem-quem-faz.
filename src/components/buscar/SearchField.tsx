import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-ink/60">O que você precisa?</span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/60" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex.: eletricista, faxina, pintura"
          className="w-full rounded-2xl border border-ink/10 bg-white py-3.5 pl-11 pr-11 text-base text-ink shadow-soft placeholder:text-ink/45 transition focus:border-petrol focus:outline-none focus-visible:ring-4 focus-visible:ring-petrol/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink/60 transition hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </span>
    </label>
  );
}
